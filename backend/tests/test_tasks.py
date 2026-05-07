"""Tests for task workflow: CRUD, timer, completion, auto-invoicing."""
import time


class TestTasks:
    def test_create_task(self, client, auth_headers, test_client_id):
        resp = client.post("/api/v1/tasks/", json={
            "title": "Test Task", "description": "Testing", "priority": "high",
            "client_id": test_client_id, "rate_type": "fixed", "rate": 500000
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["data"]["title"] == "Test Task"
        assert resp.json()["data"]["rate"] == 500000

    def test_start_timer(self, client, auth_headers):
        task = client.post("/api/v1/tasks/", json={"title": "Timer Test"}, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        resp = client.post(f"/api/v1/tasks/{task_id}/start-timer", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["timer_started_at"] is not None
        # Stop it for cleanup
        client.post(f"/api/v1/tasks/{task_id}/stop-timer", headers=auth_headers)

    def test_stop_timer(self, client, auth_headers):
        task = client.post("/api/v1/tasks/", json={"title": "Stop Test"}, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        client.post(f"/api/v1/tasks/{task_id}/start-timer", headers=auth_headers)
        time.sleep(1)
        resp = client.post(f"/api/v1/tasks/{task_id}/stop-timer", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["time_spent"] >= 1

    def test_cannot_start_timer_on_done_task(self, client, auth_headers):
        task = client.post("/api/v1/tasks/", json={"title": "Done Task"}, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        client.post(f"/api/v1/tasks/{task_id}/complete", headers=auth_headers)
        resp = client.post(f"/api/v1/tasks/{task_id}/start-timer", headers=auth_headers)
        assert resp.status_code == 400

    def test_complete_task_auto_invoice(self, client, auth_headers, test_client_id):
        task = client.post("/api/v1/tasks/", json={
            "title": "Invoice Test", "client_id": test_client_id,
            "rate_type": "fixed", "rate": 300000
        }, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        resp = client.post(f"/api/v1/tasks/{task_id}/complete", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["task"]["status"] == "done"
        assert data["invoice"] is not None
        assert data["invoice"]["amount"] == 300000

    def test_complete_task_no_client_no_invoice(self, client, auth_headers):
        task = client.post("/api/v1/tasks/", json={"title": "No Client Task", "rate": 100000}, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        resp = client.post(f"/api/v1/tasks/{task_id}/complete", headers=auth_headers)
        data = resp.json()["data"]
        assert data["task"]["status"] == "done"
        assert data.get("invoice") is None

    def test_cannot_complete_already_done(self, client, auth_headers):
        task = client.post("/api/v1/tasks/", json={"title": "Already Done"}, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        client.post(f"/api/v1/tasks/{task_id}/complete", headers=auth_headers)
        resp = client.post(f"/api/v1/tasks/{task_id}/complete", headers=auth_headers)
        assert resp.status_code == 400

    def test_delete_task(self, client, auth_headers):
        task = client.post("/api/v1/tasks/", json={"title": "Delete Me"}, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        resp = client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers)
        assert resp.status_code == 200
