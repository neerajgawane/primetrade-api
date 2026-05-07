"""Test configuration and fixtures for PrimePay API tests."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db
from app.main import app

# Use the same DB but isolated transactions
TEST_DATABASE_URL = "postgresql://primetrade:primetrade123@db:5432/primetrade_db"
engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def _register_and_login(client, suffix=""):
    import uuid
    unique = str(uuid.uuid4())[:8]
    email = f"test_{unique}{suffix}@primepay.com"
    client.post("/api/v1/auth/register", json={"email": email, "username": f"tester_{unique}", "password": "Test@12345"})
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "Test@12345"})
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def auth_headers(client):
    """Register and login a test user, return auth headers."""
    return _register_and_login(client)


@pytest.fixture
def test_client_id(client, auth_headers):
    """Create a test client and return its ID."""
    resp = client.post("/api/v1/clients/", json={"name": "Test Corp", "email": "test@corp.com", "phone": "+91 99999"}, headers=auth_headers)
    return resp.json()["data"]["id"]
