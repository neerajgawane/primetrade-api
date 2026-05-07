from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from ..models.invoice import InvoiceStatus


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    task_id: UUID
    client_id: Optional[UUID]
    user_id: UUID
    amount: int  # paise
    status: InvoiceStatus
    created_at: datetime
    paid_at: Optional[datetime]
    model_config = {"from_attributes": True}


class InvoicePublicResponse(BaseModel):
    """Public view for clients — no user_id exposed"""
    id: UUID
    invoice_number: str
    amount: int
    status: InvoiceStatus
    created_at: datetime
    paid_at: Optional[datetime]
    # Denormalized fields for display
    task_title: Optional[str] = None
    client_name: Optional[str] = None
    freelancer_name: Optional[str] = None


class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
