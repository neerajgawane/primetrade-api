import re
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator
from ..models.user import UserRole

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.strip()
        if len(v) < 3: raise ValueError("Username must be at least 3 characters")
        if len(v) > 50: raise ValueError("Username cannot exceed 50 characters")
        if not re.match(r"^[a-zA-Z0-9_]+$", v): raise ValueError("Letters, numbers, underscores only")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8: raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v): raise ValueError("Need at least one uppercase letter")
        if not re.search(r"[0-9]", v): raise ValueError("Need at least one number")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UpdateRole(BaseModel):
    role: UserRole

class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    role: UserRole
    is_active: bool
    auth_provider: str = "local"
    avatar_url: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
