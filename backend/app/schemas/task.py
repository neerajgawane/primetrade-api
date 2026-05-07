from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, field_validator
from ..models.task import RateType, TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    client_id: Optional[UUID] = None
    rate_type: RateType = RateType.FIXED
    rate: Optional[int] = None  # Amount in paise

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) > 200:
            raise ValueError("Title cannot exceed 200 characters")
        return v

    @field_validator("rate")
    @classmethod
    def validate_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError("Rate cannot be negative")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    client_id: Optional[UUID] = None
    rate_type: Optional[RateType] = None
    rate: Optional[int] = None


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    user_id: UUID
    client_id: Optional[UUID]
    rate_type: RateType
    rate: Optional[int]
    time_spent: int
    timer_started_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

