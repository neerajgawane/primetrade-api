from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session
from ..core.config import settings
from ..core.redis import blacklist_token, is_token_blacklisted
from ..core.security import create_access_token, decode_token, hash_password, verify_password
from ..core.rate_limit import check_rate_limit, reset_rate_limit
from ..models.user import AuthProvider, User, UserRole
from ..schemas.user import UserLogin, UserRegister


class AuthService:
    @staticmethod
    def register(db: Session, data: UserRegister) -> User:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=409, detail="Email already exists")
        if db.query(User).filter(User.username == data.username).first():
            raise HTTPException(status_code=409, detail="Username already taken")
        user = User(
            email=data.email,
            username=data.username,
            password_hash=hash_password(data.password),
            role=UserRole.USER,
            auth_provider=AuthProvider.LOCAL,
        )
        db.add(user); db.commit(); db.refresh(user)
        return user

    @staticmethod
    def login(db: Session, data: UserLogin, client_ip: str = "unknown") -> dict:
        # Rate limiting
        rate_key = f"login_rate:{client_ip}"
        allowed, remaining = check_rate_limit(rate_key, max_attempts=5, window_seconds=60)
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again in 1 minute.",
                headers={"Retry-After": "60"}
            )

        user = db.query(User).filter(User.email == data.email).first()
        if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account deactivated")

        # Success — reset rate limit
        reset_rate_limit(rate_key)

        token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"token": token, "user": user}

    @staticmethod
    def google_login(db: Session, id_token: str) -> dict:
        """Verify Google ID token and create/find user."""
        import httpx

        # Verify token with Google
        try:
            resp = httpx.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
                timeout=10.0
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Google token")
            payload = resp.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Failed to verify Google token")

        # Verify audience matches our client ID
        if settings.GOOGLE_CLIENT_ID and payload.get("aud") != settings.GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Token not intended for this application")

        google_id = payload.get("sub")
        email = payload.get("email")
        name = payload.get("name", "")
        picture = payload.get("picture", "")

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

        # Check if user exists by google_id first, then by email
        user = db.query(User).filter(User.google_id == google_id).first()
        if not user:
            user = db.query(User).filter(User.email == email).first()

        if user:
            # Existing user — link Google account if not already linked
            if not user.google_id:
                user.google_id = google_id
                user.auth_provider = AuthProvider.GOOGLE
                if picture and not user.avatar_url:
                    user.avatar_url = picture
                db.commit()
                db.refresh(user)
            if not user.is_active:
                raise HTTPException(status_code=403, detail="Account deactivated")
        else:
            # New user — create account without password
            # Generate unique username from name or email
            base_username = name.replace(" ", "_").lower()[:30] or email.split("@")[0]
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User(
                email=email,
                username=username,
                password_hash=None,  # No password for OAuth users
                role=UserRole.USER,
                auth_provider=AuthProvider.GOOGLE,
                google_id=google_id,
                avatar_url=picture,
            )
            db.add(user); db.commit(); db.refresh(user)

        token = create_access_token(
            data={"sub": str(user.id), "role": user.role.value},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"token": token, "user": user}

    @staticmethod
    def logout(token: str) -> None:
        try:
            payload = decode_token(token)
            exp = payload.get("exp", 0)
            ttl = exp - int(datetime.now(timezone.utc).timestamp())
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
