import json
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..core.redis import cache_get, cache_set, cache_delete_pattern
from ..models.client import Client
from ..models.invoice import Invoice, InvoiceStatus
from ..models.payment import Payment, PaymentStatus
from ..models.task import Task, TaskStatus
from ..models.user import User
from ..schemas.invoice import InvoiceResponse


class DashboardService:
    @staticmethod
    def get_stats(db: Session, user: User) -> dict:
        cache_key = f"dashboard:{user.id}"
        cached = cache_get(cache_key)
        if cached:
            return json.loads(cached)

        user_id = user.id

        # Earnings
        total_earnings = db.query(func.coalesce(func.sum(Invoice.amount), 0)).filter(
            Invoice.user_id == user_id, Invoice.status == InvoiceStatus.PAID
        ).scalar()

        pending_earnings = db.query(func.coalesce(func.sum(Invoice.amount), 0)).filter(
            Invoice.user_id == user_id, Invoice.status == InvoiceStatus.PENDING
        ).scalar()

        # Counts
        total_clients = db.query(func.count(Client.id)).filter(Client.user_id == user_id).scalar()
        active_tasks = db.query(func.count(Task.id)).filter(
            Task.user_id == user_id, Task.status.notin_([TaskStatus.ARCHIVED])
        ).scalar()
        completed_tasks = db.query(func.count(Task.id)).filter(
            Task.user_id == user_id, Task.status.in_([TaskStatus.DONE, TaskStatus.ARCHIVED])
        ).scalar()
        total_invoices = db.query(func.count(Invoice.id)).filter(Invoice.user_id == user_id).scalar()
        paid_invoices = db.query(func.count(Invoice.id)).filter(
            Invoice.user_id == user_id, Invoice.status == InvoiceStatus.PAID
        ).scalar()

        # Recent invoices (last 5)
        recent_invoices = db.query(Invoice).filter(
            Invoice.user_id == user_id
        ).order_by(Invoice.created_at.desc()).limit(5).all()

        # Total time tracked (seconds)
        total_time = db.query(func.coalesce(func.sum(Task.time_spent), 0)).filter(
            Task.user_id == user_id
        ).scalar()

        result = {
            "total_earnings": total_earnings,  # paise
            "pending_earnings": pending_earnings,  # paise
            "total_clients": total_clients,
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks,
            "total_invoices": total_invoices,
            "paid_invoices": paid_invoices,
            "total_time_tracked": total_time,  # seconds
            "recent_invoices": [InvoiceResponse.model_validate(i).model_dump(mode="json") for i in recent_invoices],
        }
        cache_set(cache_key, json.dumps(result), ttl=120)
        return result
