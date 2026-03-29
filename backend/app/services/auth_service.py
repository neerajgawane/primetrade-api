from datetime import datetime, timedelta
from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.redis import blacklist_token, is_token_blacklisted
from ..core.security import create_access_token, decode_token, hash_password, verify_password
from ..models.user import User, UserRole
from ..schemas.user import UserLogin, UserRegister

class AuthService:
    @staticmethod
    def register(db: Session, data: UserRegister) -> User:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=409, detail="Email already exists")
        if db.query(User).filter(User.username == data.username).first():
            raise HTTPException(status_code=409, detail="Username already taken")
        user = User(email=data.email, username=data.username, password_hash=hash_password(data.password), role=UserRole.USER)
        db.add(user); db.commit(); db.refresh(user)
        return user

    @staticmethod
    def login(db: Session, data: UserLogin) -> dict:
        user = db.query(User).filter(User.email == data.email).first()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account deactivated")
        token = create_access_token(data={"sub": str(user.id), "role": user.role.value}, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
        return {"token": token, "user": user}

    @staticmethod
    def logout(token: str) -> None:
        try:
            payload = decode_token(token)
            exp = payload.get("exp", 0)
            ttl = exp - int(datetime.utcnow().timestamp())
            if ttl > 0: blacklist_token(token, ttl)
        except JWTError:
            pass

    @staticmethod
    def get_current_user(token: str, db: Session) -> User:
        if is_token_blacklisted(token):
            raise HTTPException(status_code=401, detail="Token revoked. Please log in again.")
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            if not user_id: raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Token invalid or expired", headers={"WWW-Authenticate": "Bearer"})
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or deactivated")
        return user
