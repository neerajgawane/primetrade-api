from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from ..models.payment import PaymentStatus


class PaymentResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    razorpay_order_id: str
    razorpay_payment_id: Optional[str]
    amount: int
    currency: str
    status: PaymentStatus
    created_at: datetime
    paid_at: Optional[datetime]
    model_config = {"from_attributes": True}


class CreateOrderRequest(BaseModel):
    invoice_id: UUID


class CreateOrderResponse(BaseModel):
    """Response sent to frontend to open Razorpay checkout"""
    order_id: str
    amount: int  # paise
    currency: str
    key_id: str  # Razorpay public key (safe to expose)
    invoice_id: str
    invoice_number: str
    # Pre-fill info for checkout
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
