import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.user import User, UserRole

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try: yield db
    finally: db.close()

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

@pytest.fixture
def client(): return TestClient(app)

@pytest.fixture
def db():
    db = TestingSessionLocal()
    try: yield db
    finally: db.close()

@pytest.fixture
def test_user(db):
    user = User(email="user@test.com", username="testuser", password_hash=hash_password("Password1"), role=UserRole.USER)
    db.add(user); db.commit(); db.refresh(user)
    return user

@pytest.fixture
def test_admin(db):
    admin = User(email="admin@test.com", username="testadmin", password_hash=hash_password("Password1"), role=UserRole.ADMIN)
    db.add(admin); db.commit(); db.refresh(admin)
    return admin

@pytest.fixture
def user_token(client, test_user):
    res = client.post("/api/v1/auth/login", json={"email": "user@test.com", "password": "Password1"})
    return res.json()["data"]["access_token"]

@pytest.fixture
def admin_token(client, test_admin):
    res = client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": "Password1"})
    return res.json()["data"]["access_token"]
