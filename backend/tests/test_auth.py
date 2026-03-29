def test_register_success(client):
    res = client.post("/api/v1/auth/register", json={"email": "new@test.com", "username": "newuser", "password": "Password1"})
    assert res.status_code == 201
    assert res.json()["success"] is True

def test_register_duplicate_email(client, test_user):
    res = client.post("/api/v1/auth/register", json={"email": "user@test.com", "username": "different", "password": "Password1"})
    assert res.status_code == 409

def test_login_success(client, test_user):
    res = client.post("/api/v1/auth/login", json={"email": "user@test.com", "password": "Password1"})
    assert res.status_code == 200
    assert "access_token" in res.json()["data"]

def test_login_wrong_password(client, test_user):
    res = client.post("/api/v1/auth/login", json={"email": "user@test.com", "password": "Wrong1"})
    assert res.status_code == 401

def test_get_me(client, user_token):
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
