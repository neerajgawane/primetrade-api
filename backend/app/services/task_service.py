import json, math
from datetime import datetime
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from ..core.redis import cache_delete_pattern, cache_get, cache_set
from ..models.client import Client
from ..models.task import Task, TaskStatus
from ..models.user import User, UserRole
from ..schemas.task import TaskCreate, TaskResponse, TaskUpdate


class TaskService:
    @staticmethod
    def _cache_key(user_id, page, per_page):
        return f"tasks:{user_id}:p{page}:n{per_page}"

    @staticmethod
    def get_tasks(db: Session, user: User, page: int = 1, per_page: int = 10) -> dict:
        cache_key = TaskService._cache_key(str(user.id), page, per_page)
        cached = cache_get(cache_key)
        if cached:
            return json.loads(cached)
        query = db.query(Task)
        if user.role != UserRole.ADMIN:
            query = query.filter(Task.user_id == user.id)
        query = query.order_by(Task.created_at.desc())
        total = query.count()
        tasks = query.offset((page - 1) * per_page).limit(per_page).all()
        result = {
            "tasks": [TaskResponse.model_validate(t).model_dump(mode="json") for t in tasks],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 1,
        }
        cache_set(cache_key, json.dumps(result), ttl=300)
        return result

    @staticmethod
    def get_task(db: Session, task_id: UUID, user: User) -> Task:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if user.role != UserRole.ADMIN and task.user_id != user.id:
            raise HTTPException(status_code=403, detail="No permission to access this task")
        return task

    @staticmethod
    def create_task(db: Session, data: TaskCreate, user: User) -> Task:
        task_data = data.model_dump()
        # Validate client belongs to user if provided
        if task_data.get("client_id"):
            client = db.query(Client).filter(Client.id == task_data["client_id"]).first()
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")
            if client.user_id != user.id:
                raise HTTPException(status_code=403, detail="Client does not belong to you")
        task = Task(**task_data, user_id=user.id)
        db.add(task)
        db.commit()
        db.refresh(task)
        cache_delete_pattern(f"tasks:{user.id}:*")
        return task

    @staticmethod
    def update_task(db: Session, task_id: UUID, data: TaskUpdate, user: User) -> Task:
        task = TaskService.get_task(db, task_id, user)
        update_data = data.model_dump(exclude_unset=True)
        # Validate client belongs to user if changing client
        if "client_id" in update_data and update_data["client_id"]:
            client = db.query(Client).filter(Client.id == update_data["client_id"]).first()
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")
            if client.user_id != user.id:
                raise HTTPException(status_code=403, detail="Client does not belong to you")
        for field, value in update_data.items():
            setattr(task, field, value)
        db.commit()
        db.refresh(task)
        cache_delete_pattern(f"tasks:{user.id}:*")
        return task

    @staticmethod
    def delete_task(db: Session, task_id: UUID, user: User) -> None:
        task = TaskService.get_task(db, task_id, user)
        if task.timer_started_at:
            raise HTTPException(status_code=400, detail="Stop the timer before deleting this task")
        # Check for unpaid invoices linked to this task
        from ..models.invoice import Invoice, InvoiceStatus
        unpaid = db.query(Invoice).filter(
            Invoice.task_id == task_id,
            Invoice.status == InvoiceStatus.PENDING,
        ).first()
        if unpaid:
            raise HTTPException(status_code=400, detail=f"Cannot delete: task has unpaid invoice {unpaid.invoice_number}")
        owner_id = str(task.user_id)
        db.delete(task)
        db.commit()
        cache_delete_pattern(f"tasks:{owner_id}:*")

    # ── Time Tracking ──────────────────────────────────────────────

    @staticmethod
    def start_timer(db: Session, task_id: UUID, user: User) -> Task:
        task = TaskService.get_task(db, task_id, user)
        if task.timer_started_at:
            raise HTTPException(status_code=400, detail="Timer is already running for this task")
        if task.status in (TaskStatus.DONE, TaskStatus.ARCHIVED):
            raise HTTPException(status_code=400, detail="Cannot start timer on a completed/archived task")
        # Stop any other running timer for this user
        running = db.query(Task).filter(
            Task.user_id == user.id,
            Task.timer_started_at.isnot(None),
            Task.id != task_id,
        ).first()
        if running:
            elapsed = int((datetime.utcnow() - running.timer_started_at).total_seconds())
            running.time_spent += elapsed
            running.timer_started_at = None
        task.timer_started_at = datetime.utcnow()
        if task.status == TaskStatus.TODO:
            task.status = TaskStatus.IN_PROGRESS
        db.commit()
        db.refresh(task)
        cache_delete_pattern(f"tasks:{user.id}:*")
        return task

    @staticmethod
    def stop_timer(db: Session, task_id: UUID, user: User) -> Task:
        task = TaskService.get_task(db, task_id, user)
        if not task.timer_started_at:
            raise HTTPException(status_code=400, detail="Timer is not running for this task")
        elapsed = int((datetime.utcnow() - task.timer_started_at).total_seconds())
        task.time_spent += elapsed
        task.timer_started_at = None
        db.commit()
        db.refresh(task)
        cache_delete_pattern(f"tasks:{user.id}:*")
        return task

    @staticmethod
    def complete_task(db: Session, task_id: UUID, user: User) -> dict:
        """Mark task as done. Auto-creates invoice if task has a rate and client."""
        task = TaskService.get_task(db, task_id, user)
        if task.status == TaskStatus.DONE:
            raise HTTPException(status_code=400, detail="Task is already completed")
        if task.status == TaskStatus.ARCHIVED:
            raise HTTPException(status_code=400, detail="Task is archived")
        # Stop timer if running
        if task.timer_started_at:
            elapsed = int((datetime.utcnow() - task.timer_started_at).total_seconds())
            task.time_spent += elapsed
            task.timer_started_at = None
        task.status = TaskStatus.DONE
        db.flush()  # Flush task changes before creating invoice

        # Auto-create invoice if task has rate and client (prevent duplicates)
        invoice = None
        if task.rate and task.client_id:
            from ..models.invoice import Invoice as InvoiceModel
            existing_invoice = db.query(InvoiceModel).filter(InvoiceModel.task_id == task.id).first()
            if not existing_invoice:
                from ..services.invoice_service import InvoiceService
                invoice = InvoiceService.create_from_task(db, task, user)

        db.commit()
        db.refresh(task)
        cache_delete_pattern(f"tasks:{user.id}:*")

        result = {"task": TaskResponse.model_validate(task).model_dump(mode="json")}
        if invoice:
            from ..schemas.invoice import InvoiceResponse
            result["invoice"] = InvoiceResponse.model_validate(invoice).model_dump(mode="json")
        return result
