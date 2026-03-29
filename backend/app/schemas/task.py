from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, field_validator
from ..models.task import TaskPriority, TaskStatus

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM

    @field_validator("title")
    @classmethod
    def validate_title(cls, v):
        v = v.strip()
        if not v: raise ValueError("Title cannot be empty")
        if len(v) > 200: raise ValueError("Title cannot exceed 200 characters")
        return v

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None

class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
