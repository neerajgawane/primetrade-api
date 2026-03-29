import json, math
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from ..core.redis import cache_delete_pattern, cache_get, cache_set
from ..models.task import Task
from ..models.user import User, UserRole
from ..schemas.task import TaskCreate, TaskResponse, TaskUpdate

class TaskService:
    @staticmethod
    def _cache_key(user_id, page, per_page): return f"tasks:{user_id}:p{page}:n{per_page}"

    @staticmethod
    def get_tasks(db: Session, user: User, page: int = 1, per_page: int = 10) -> dict:
        cache_key = TaskService._cache_key(str(user.id), page, per_page)
        cached = cache_get(cache_key)
        if cached: return json.loads(cached)
        query = db.query(Task)
        if user.role != UserRole.ADMIN: query = query.filter(Task.user_id == user.id)
        query = query.order_by(Task.created_at.desc())
        total = query.count()
        tasks = query.offset((page - 1) * per_page).limit(per_page).all()
        result = {"tasks": [TaskResponse.model_validate(t).model_dump(mode="json") for t in tasks], "total": total, "page": page, "per_page": per_page, "total_pages": math.ceil(total / per_page) if total > 0 else 1}
        cache_set(cache_key, json.dumps(result), ttl=300)
        return result

    @staticmethod
    def get_task(db: Session, task_id: UUID, user: User) -> Task:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task: raise HTTPException(status_code=404, detail="Task not found")
        if user.role != UserRole.ADMIN and task.user_id != user.id:
            raise HTTPException(status_code=403, detail="No permission to access this task")
        return task

    @staticmethod
    def create_task(db: Session, data: TaskCreate, user: User) -> Task:
        task = Task(**data.model_dump(), user_id=user.id)
        db.add(task); db.commit(); db.refresh(task)
        cache_delete_pattern(f"tasks:{user.id}:*")
        return task

    @staticmethod
    def update_task(db: Session, task_id: UUID, data: TaskUpdate, user: User) -> Task:
        task = TaskService.get_task(db, task_id, user)
        for field, value in data.model_dump(exclude_unset=True).items(): setattr(task, field, value)
        db.commit(); db.refresh(task)
        cache_delete_pattern(f"tasks:{user.id}:*")
        return task

    @staticmethod
    def delete_task(db: Session, task_id: UUID, user: User) -> None:
        task = TaskService.get_task(db, task_id, user)
        owner_id = str(task.user_id)
        db.delete(task); db.commit()
        cache_delete_pattern(f"tasks:{owner_id}:*")
