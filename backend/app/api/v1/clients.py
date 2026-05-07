from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...schemas.common import APIResponse
from ...schemas.client import ClientCreate, ClientResponse, ClientUpdate
from ...services.client_service import ClientService
from .deps import get_current_user

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=APIResponse)
async def list_clients(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=100), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Clients retrieved", data=ClientService.get_clients(db, current_user, page, per_page))


@router.post("", response_model=APIResponse, status_code=201)
async def create_client(data: ClientCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    client = ClientService.create_client(db, data, current_user)
    return APIResponse(success=True, message="Client created", data=ClientResponse.model_validate(client))


@router.get("/{client_id}", response_model=APIResponse)
async def get_client(client_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Client retrieved", data=ClientResponse.model_validate(ClientService.get_client(db, client_id, current_user)))


@router.put("/{client_id}", response_model=APIResponse)
async def update_client(client_id: UUID, data: ClientUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return APIResponse(success=True, message="Client updated", data=ClientResponse.model_validate(ClientService.update_client(db, client_id, data, current_user)))


@router.delete("/{client_id}", response_model=APIResponse)
async def delete_client(client_id: UUID, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    ClientService.delete_client(db, client_id, current_user)
    return APIResponse(success=True, message="Client deleted")
