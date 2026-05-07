from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...schemas.common import APIResponse
from ...schemas.payment import CreateOrderRequest
from ...services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-order", response_model=APIResponse)
async def create_order(data: CreateOrderRequest, db: Session = Depends(get_db)):
    """Create a Razorpay payment order for an invoice. PUBLIC — no auth required.
    Clients use this when they click a payment link."""
    order = PaymentService.create_order(db, data.invoice_id)
    return APIResponse(success=True, message="Payment order created", data=order.model_dump())


@router.post("/verify", response_model=APIResponse)
async def verify_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Razorpay webhook endpoint — NO authentication.
    Razorpay sends payment events here. Verified via HMAC-SHA256 signature.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    if not signature:
        return APIResponse(success=False, message="Missing signature header")

    success = PaymentService.verify_webhook(db, raw_body, signature)

    if success:
        return APIResponse(success=True, message="Webhook processed")
    else:
        return APIResponse(success=False, message="Webhook verification failed")
