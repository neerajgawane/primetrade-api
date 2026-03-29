def auth(token): return {"Authorization": f"Bearer {token}"}

def test_create_task(client, user_token):
    res = client.post("/api/v1/tasks", json={"title": "My task", "priority": "high"}, headers=auth(user_token))
    assert res.status_code == 201

def test_list_tasks(client, user_token):
    client.post("/api/v1/tasks", json={"title": "Task 1"}, headers=auth(user_token))
    client.post("/api/v1/tasks", json={"title": "Task 2"}, headers=auth(user_token))
    res = client.get("/api/v1/tasks", headers=auth(user_token))
    assert res.json()["data"]["total"] == 2

def test_delete_task(client, user_token):
    res = client.post("/api/v1/tasks", json={"title": "Delete me"}, headers=auth(user_token))
    task_id = res.json()["data"]["id"]
    del_res = client.delete(f"/api/v1/tasks/{task_id}", headers=auth(user_token))
    assert del_res.status_code == 200

def test_user_cannot_access_others_task(client, user_token, admin_token):
    res = client.post("/api/v1/tasks", json={"title": "Admin task"}, headers=auth(admin_token))
    task_id = res.json()["data"]["id"]
    assert client.get(f"/api/v1/tasks/{task_id}", headers=auth(user_token)).status_code == 403
