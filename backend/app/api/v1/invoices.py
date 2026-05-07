from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...schemas.common import APIResponse
from ...schemas.invoice import InvoiceResponse
from ...services.invoice_service import InvoiceService
from .deps import get_current_user

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", response_model=APIResponse)
async def list_invoices(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=100), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Invoices retrieved", data=InvoiceService.get_invoices(db, current_user, page, per_page))


@router.get("/{invoice_id}", response_model=APIResponse)
async def get_invoice(invoice_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Invoice retrieved", data=InvoiceResponse.model_validate(InvoiceService.get_invoice(db, invoice_id, current_user)))


@router.get("/{invoice_id}/public", response_model=APIResponse)
async def get_invoice_public(invoice_id: UUID, db: Session = Depends(get_db)):
    """Public invoice page — no authentication required. Clients use this to view and pay."""
    return APIResponse(success=True, message="Invoice retrieved", data=InvoiceService.get_invoice_public(db, invoice_id))
