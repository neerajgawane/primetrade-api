from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...schemas.common import APIResponse
from ...schemas.user import TokenResponse, UserLogin, UserRegister, UserResponse
from ...services.auth_service import AuthService
from .deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


class GoogleLoginRequest(BaseModel):
    id_token: str


@router.post("/register", response_model=APIResponse, status_code=201)
async def register(data: UserRegister, db: Session = Depends(get_db)):
    user = AuthService.register(db, data)
    return APIResponse(success=True, message="Account created successfully", data=UserResponse.model_validate(user))


@router.post("/login", response_model=APIResponse)
async def login(data: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    result = AuthService.login(db, data, client_ip=client_ip)
    return APIResponse(success=True, message="Login successful", data=TokenResponse(access_token=result["token"], user=UserResponse.model_validate(result["user"])))


@router.post("/google", response_model=APIResponse)
async def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    result = AuthService.google_login(db, data.id_token)
    return APIResponse(success=True, message="Google login successful", data=TokenResponse(access_token=result["token"], user=UserResponse.model_validate(result["user"])))


@router.post("/logout", response_model=APIResponse)
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    AuthService.logout(credentials.credentials)
    return APIResponse(success=True, message="Logged out successfully")


@router.get("/me", response_model=APIResponse)
async def me(current_user=Depends(get_current_user)):
    return APIResponse(success=True, message="User profile", data=UserResponse.model_validate(current_user))
