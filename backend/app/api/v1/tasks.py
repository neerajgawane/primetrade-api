from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...schemas.common import APIResponse
from ...schemas.task import TaskCreate, TaskResponse, TaskUpdate
from ...services.task_service import TaskService
from .deps import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=APIResponse)
async def list_tasks(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=100), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Tasks retrieved", data=TaskService.get_tasks(db, current_user, page, per_page))


@router.post("", response_model=APIResponse, status_code=201)
async def create_task(data: TaskCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = TaskService.create_task(db, data, current_user)
    return APIResponse(success=True, message="Task created", data=TaskResponse.model_validate(task))


@router.get("/{task_id}", response_model=APIResponse)
async def get_task(task_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Task retrieved", data=TaskResponse.model_validate(TaskService.get_task(db, task_id, current_user)))


@router.put("/{task_id}", response_model=APIResponse)
async def update_task(task_id: UUID, data: TaskUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Task updated", data=TaskResponse.model_validate(TaskService.update_task(db, task_id, data, current_user)))


@router.delete("/{task_id}", response_model=APIResponse)
async def delete_task(task_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    TaskService.delete_task(db, task_id, current_user)
    return APIResponse(success=True, message="Task deleted")


# ── Timer Endpoints ──────────────────────────────────────────────

@router.post("/{task_id}/start-timer", response_model=APIResponse)
async def start_timer(task_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = TaskService.start_timer(db, task_id, current_user)
    return APIResponse(success=True, message="Timer started", data=TaskResponse.model_validate(task))


@router.post("/{task_id}/stop-timer", response_model=APIResponse)
async def stop_timer(task_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = TaskService.stop_timer(db, task_id, current_user)
    return APIResponse(success=True, message="Timer stopped", data=TaskResponse.model_validate(task))


@router.post("/{task_id}/complete", response_model=APIResponse)
async def complete_task(task_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    result = TaskService.complete_task(db, task_id, current_user)
    msg = "Task completed"
    if result.get("invoice"):
        msg += " and invoice auto-generated"
    return APIResponse(success=True, message=msg, data=result)
