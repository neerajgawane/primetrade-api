import json, math
from datetime import datetime
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..core.redis import cache_delete_pattern, cache_get, cache_set
from ..models.invoice import Invoice, InvoiceStatus
from ..models.task import Task, RateType
from ..models.user import User, UserRole
from ..schemas.invoice import InvoicePublicResponse, InvoiceResponse


class InvoiceService:
    @staticmethod
    def _cache_key(user_id, page, per_page):
        return f"invoices:{user_id}:p{page}:n{per_page}"

    @staticmethod
    def _generate_invoice_number(db: Session) -> str:
        """Generate sequential invoice number: INV-YYYY-NNNN"""
        year = datetime.utcnow().year
        count = db.query(Invoice).filter(
            Invoice.invoice_number.like(f"INV-{year}-%")
        ).count()
        return f"INV-{year}-{str(count + 1).zfill(4)}"

    @staticmethod
    def create_from_task(db: Session, task: Task, user: User) -> Invoice:
        """Auto-generate invoice when task is completed. Called within TaskService.complete_task() transaction."""
        # Calculate amount based on rate type
        if task.rate_type == RateType.FIXED:
            amount = task.rate
        else:
            # Hourly: rate (paise per hour) × hours worked
            hours = task.time_spent / 3600
            amount = int(task.rate * hours)

        if not amount or amount <= 0:
            raise HTTPException(status_code=400, detail="Cannot create invoice: task has no valid rate")

        invoice = Invoice(
            invoice_number=InvoiceService._generate_invoice_number(db),
            task_id=task.id,
            client_id=task.client_id,
            user_id=user.id,
            amount=amount,
            status=InvoiceStatus.PENDING,
        )
        db.add(invoice)
        db.flush()  # Get the ID without committing (parent transaction will commit)
        cache_delete_pattern(f"invoices:{user.id}:*")
        cache_delete_pattern(f"dashboard:{user.id}")
        return invoice

    @staticmethod
    def get_invoices(db: Session, user: User, page: int = 1, per_page: int = 10) -> dict:
        cache_key = InvoiceService._cache_key(str(user.id), page, per_page)
        cached = cache_get(cache_key)
        if cached:
            return json.loads(cached)
        query = db.query(Invoice)
        if user.role != UserRole.ADMIN:
            query = query.filter(Invoice.user_id == user.id)
        query = query.order_by(Invoice.created_at.desc())
        total = query.count()
        invoices = query.offset((page - 1) * per_page).limit(per_page).all()
        result = {
            "invoices": [InvoiceResponse.model_validate(i).model_dump(mode="json") for i in invoices],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 1,
        }
        cache_set(cache_key, json.dumps(result), ttl=300)
        return result

    @staticmethod
    def get_invoice(db: Session, invoice_id: UUID, user: User) -> Invoice:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if user.role != UserRole.ADMIN and invoice.user_id != user.id:
            raise HTTPException(status_code=403, detail="No permission to access this invoice")
        return invoice

    @staticmethod
    def get_invoice_public(db: Session, invoice_id: UUID) -> dict:
        """Public invoice view — no auth required. Used for client payment page."""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        # Build public response with denormalized data
        data = InvoicePublicResponse(
            id=invoice.id,
            invoice_number=invoice.invoice_number,
            amount=invoice.amount,
            status=invoice.status,
            created_at=invoice.created_at,
            paid_at=invoice.paid_at,
            task_title=invoice.task.title if invoice.task else None,
            client_name=invoice.client.name if invoice.client else None,
            freelancer_name=invoice.owner.username if invoice.owner else None,
        )
        return data.model_dump(mode="json")

    @staticmethod
    def mark_paid(db: Session, invoice_id: UUID) -> Invoice:
        """Called by payment webhook — set status=paid, paid_at=now, archive task."""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.status == InvoiceStatus.PAID:
            return invoice  # Idempotent — already paid, skip
        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = datetime.utcnow()
        # Auto-archive the task
        if invoice.task:
            from ..models.task import TaskStatus
            invoice.task.status = TaskStatus.ARCHIVED
        db.commit()
        db.refresh(invoice)
        cache_delete_pattern(f"invoices:{invoice.user_id}:*")
        cache_delete_pattern(f"tasks:{invoice.user_id}:*")
        cache_delete_pattern(f"dashboard:{invoice.user_id}")
        return invoice
