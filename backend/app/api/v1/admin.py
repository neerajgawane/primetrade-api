from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...models.user import User
from ...schemas.common import APIResponse
from ...schemas.user import UpdateRole, UserResponse
from .deps import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/users", response_model=APIResponse)
async def list_users(admin=Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return APIResponse(success=True, message=f"{len(users)} users found", data=[UserResponse.model_validate(u) for u in users])

@router.get("/users/{user_id}", response_model=APIResponse)
async def get_user(user_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    return APIResponse(success=True, message="User retrieved", data=UserResponse.model_validate(user))

@router.patch("/users/{user_id}/role", response_model=APIResponse)
async def update_role(user_id: UUID, data: UpdateRole, admin=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.role = data.role; db.commit(); db.refresh(user)
    return APIResponse(success=True, message=f"Role updated to {data.role.value}", data=UserResponse.model_validate(user))

@router.patch("/users/{user_id}/deactivate", response_model=APIResponse)
async def deactivate(user_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(admin.id): raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = False; db.commit()
    return APIResponse(success=True, message="User deactivated")

@router.patch("/users/{user_id}/activate", response_model=APIResponse)
async def activate(user_id: UUID, admin=Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True; db.commit()
    return APIResponse(success=True, message="User activated")
