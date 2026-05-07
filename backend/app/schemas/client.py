from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, field_validator


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Client name cannot be empty")
        if len(v) > 200:
            raise ValueError("Client name cannot exceed 200 characters")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            v = v.strip()
            if v and len(v) > 20:
                raise ValueError("Phone number cannot exceed 20 characters")
        return v


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    clients: List[ClientResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
