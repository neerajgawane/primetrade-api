from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...schemas.common import APIResponse
from ...services.dashboard_service import DashboardService
from .deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=APIResponse)
async def get_dashboard(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Dashboard stats retrieved", data=DashboardService.get_stats(db, current_user))
