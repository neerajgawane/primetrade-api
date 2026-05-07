import json, math
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..core.redis import cache_delete_pattern, cache_get, cache_set
from ..models.client import Client
from ..models.user import User, UserRole
from ..schemas.client import ClientCreate, ClientResponse, ClientUpdate


class ClientService:
    @staticmethod
    def _cache_key(user_id, page, per_page):
        return f"clients:{user_id}:p{page}:n{per_page}"

    @staticmethod
    def get_clients(db: Session, user: User, page: int = 1, per_page: int = 10) -> dict:
        cache_key = ClientService._cache_key(str(user.id), page, per_page)
        cached = cache_get(cache_key)
        if cached:
            return json.loads(cached)
        query = db.query(Client)
        if user.role != UserRole.ADMIN:
            query = query.filter(Client.user_id == user.id)
        query = query.order_by(Client.created_at.desc())
        total = query.count()
        clients = query.offset((page - 1) * per_page).limit(per_page).all()
        result = {
            "clients": [ClientResponse.model_validate(c).model_dump(mode="json") for c in clients],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if total > 0 else 1,
        }
        cache_set(cache_key, json.dumps(result), ttl=300)
        return result

    @staticmethod
    def get_client(db: Session, client_id: UUID, user: User) -> Client:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        if user.role != UserRole.ADMIN and client.user_id != user.id:
            raise HTTPException(status_code=403, detail="No permission to access this client")
        return client

    @staticmethod
    def create_client(db: Session, data: ClientCreate, user: User) -> Client:
        client = Client(**data.model_dump(), user_id=user.id)
        db.add(client)
        db.commit()
        db.refresh(client)
        cache_delete_pattern(f"clients:{user.id}:*")
        return client

    @staticmethod
    def update_client(db: Session, client_id: UUID, data: ClientUpdate, user: User) -> Client:
        client = ClientService.get_client(db, client_id, user)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(client, field, value)
        db.commit()
        db.refresh(client)
        cache_delete_pattern(f"clients:{user.id}:*")
        return client

    @staticmethod
    def delete_client(db: Session, client_id: UUID, user: User) -> None:
        client = ClientService.get_client(db, client_id, user)
        owner_id = str(client.user_id)
        db.delete(client)
        db.commit()
        cache_delete_pattern(f"clients:{owner_id}:*")
        # Also invalidate task cache since tasks linked to this client will be cascade deleted
        cache_delete_pattern(f"tasks:{owner_id}:*")
