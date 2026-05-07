"""Tests for authentication endpoints."""
import uuid


class TestAuth:
    def test_register_success(self, client):
        u = str(uuid.uuid4())[:8]
        resp = client.post("/api/v1/auth/register", json={"email": f"{u}@test.com", "username": f"u{u}", "password": "Secure@123"})
        assert resp.status_code == 201
        assert resp.json()["success"] is True
        assert "id" in resp.json()["data"]

    def test_register_duplicate_email(self, client):
        u = str(uuid.uuid4())[:8]
        data = {"email": f"{u}@dup.com", "username": f"dup{u}", "password": "Secure@123"}
        client.post("/api/v1/auth/register", json=data)
        resp = client.post("/api/v1/auth/register", json={**data, "username": f"other{u}"})
        assert resp.status_code == 409

    def test_login_success(self, client):
        u = str(uuid.uuid4())[:8]
        client.post("/api/v1/auth/register", json={"email": f"{u}@login.com", "username": f"lg{u}", "password": "Pass@12345"})
        resp = client.post("/api/v1/auth/login", json={"email": f"{u}@login.com", "password": "Pass@12345"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()["data"]

    def test_login_wrong_password(self, client):
        u = str(uuid.uuid4())[:8]
        client.post("/api/v1/auth/register", json={"email": f"{u}@wrong.com", "username": f"wr{u}", "password": "Pass@12345"})
        resp = client.post("/api/v1/auth/login", json={"email": f"{u}@wrong.com", "password": "WrongPassword"})
        assert resp.status_code == 401

    def test_protected_route_without_token(self, client):
        resp = client.get("/api/v1/tasks/")
        assert resp.status_code in (401, 403)

    def test_logout(self, client):
        u = str(uuid.uuid4())[:8]
        client.post("/api/v1/auth/register", json={"email": f"{u}@out.com", "username": f"out{u}", "password": "Pass@12345"})
        login = client.post("/api/v1/auth/login", json={"email": f"{u}@out.com", "password": "Pass@12345"})
        token = login.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.post("/api/v1/auth/logout", headers=headers)
        assert resp.status_code == 200
        # Token should be blacklisted now
        resp2 = client.get("/api/v1/tasks/", headers=headers)
        assert resp2.status_code == 401
