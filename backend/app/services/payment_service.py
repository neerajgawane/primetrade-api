import hashlib, hmac, logging, json
from datetime import datetime
from uuid import UUID
import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..core.config import settings
from ..models.invoice import Invoice, InvoiceStatus
from ..models.payment import Payment, PaymentStatus
from ..schemas.payment import CreateOrderResponse

logger = logging.getLogger(__name__)

RAZORPAY_BASE = "https://api.razorpay.com/v1"


class PaymentService:
    @staticmethod
    def _razorpay_request(method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to Razorpay API using Basic Auth."""
        url = f"{RAZORPAY_BASE}/{endpoint}"
        auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        try:
            resp = httpx.request(method, url, json=data, auth=auth, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Razorpay API error: {e.response.status_code} — {e.response.text}")
            raise HTTPException(status_code=502, detail="Payment gateway error. Please try again.")
        except Exception as e:
            logger.error(f"Razorpay request failed: {e}")
            raise HTTPException(status_code=502, detail="Payment gateway unavailable.")

    @staticmethod
    def create_order(db: Session, invoice_id: UUID) -> CreateOrderResponse:
        """Create a Razorpay order for an invoice. Returns data for frontend checkout."""
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.status == InvoiceStatus.PAID:
            raise HTTPException(status_code=400, detail="Invoice is already paid")

        # Check if order already exists for this invoice (idempotent)
        existing = db.query(Payment).filter(
            Payment.invoice_id == invoice_id,
            Payment.status == PaymentStatus.CREATED,
        ).first()
        if existing:
            return CreateOrderResponse(
                order_id=existing.razorpay_order_id,
                amount=existing.amount,
                currency=existing.currency,
                key_id=settings.RAZORPAY_KEY_ID,
                invoice_id=str(invoice.id),
                invoice_number=invoice.invoice_number,
                client_name=invoice.client.name if invoice.client else None,
                client_email=invoice.client.email if invoice.client else None,
                client_phone=invoice.client.phone if invoice.client else None,
            )

        # Create Razorpay order via REST API (no SDK needed)
        order_data = PaymentService._razorpay_request("POST", "orders", {
            "amount": invoice.amount,  # already in paise
            "currency": "INR",
            "receipt": invoice.invoice_number,
            "notes": {
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
            },
        })

        # Save payment record
        payment = Payment(
            invoice_id=invoice.id,
            razorpay_order_id=order_data["id"],
            amount=invoice.amount,
            currency="INR",
            status=PaymentStatus.CREATED,
        )
        db.add(payment)
        db.commit()

        return CreateOrderResponse(
            order_id=order_data["id"],
            amount=invoice.amount,
            currency="INR",
            key_id=settings.RAZORPAY_KEY_ID,
            invoice_id=str(invoice.id),
            invoice_number=invoice.invoice_number,
            client_name=invoice.client.name if invoice.client else None,
            client_email=invoice.client.email if invoice.client else None,
            client_phone=invoice.client.phone if invoice.client else None,
        )

    @staticmethod
    def verify_webhook(db: Session, raw_body: bytes, signature: str) -> bool:
        """
        Verify Razorpay webhook signature and process payment.

        CRITICAL: Uses raw_body (bytes) for HMAC verification.
        Parsing JSON before verifying would break the signature.
        """
        # Step 1: Verify HMAC-SHA256 signature
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            logger.warning("Webhook signature verification failed")
            return False

        # Step 2: Parse the payload
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            logger.error("Webhook payload is not valid JSON")
            return False

        event = payload.get("event", "")
        logger.info(f"Razorpay webhook event: {event}")

        if event != "payment.captured":
            return True  # We only care about successful payments

        # Step 3: Extract payment details
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        razorpay_payment_id = payment_entity.get("id")

        if not order_id or not razorpay_payment_id:
            logger.error("Webhook missing order_id or payment_id")
            return False

        # Step 4: Find and update payment record (idempotent)
        payment = db.query(Payment).filter(Payment.razorpay_order_id == order_id).first()
        if not payment:
            logger.warning(f"No payment record found for order: {order_id}")
            return False

        if payment.status == PaymentStatus.PAID:
            logger.info(f"Payment already processed (idempotent skip): {order_id}")
            return True

        payment.razorpay_payment_id = razorpay_payment_id
        payment.status = PaymentStatus.PAID
        payment.paid_at = datetime.utcnow()

        # Step 5: Mark invoice as paid + archive task
        from ..services.invoice_service import InvoiceService
        InvoiceService.mark_paid(db, payment.invoice_id)

        logger.info(f"Payment verified and processed: {order_id} → {razorpay_payment_id}")
        return True
