"""Tests for client CRUD endpoints."""


class TestClients:
    def test_create_client(self, client, auth_headers):
        resp = client.post("/api/v1/clients/", json={"name": "Acme Inc", "email": "acme@test.com"}, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["data"]["name"] == "Acme Inc"

    def test_list_clients(self, client, auth_headers):
        resp = client.get("/api/v1/clients/", headers=auth_headers)
        assert resp.status_code == 200
        assert "clients" in resp.json()["data"]

    def test_create_client_missing_name(self, client, auth_headers):
        resp = client.post("/api/v1/clients/", json={"email": "no_name@test.com"}, headers=auth_headers)
        assert resp.status_code == 422

    def test_update_client(self, client, auth_headers, test_client_id):
        resp = client.put(f"/api/v1/clients/{test_client_id}", json={"name": "Updated Corp"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Updated Corp"

    def test_get_nonexistent_client(self, client, auth_headers):
        resp = client.get("/api/v1/clients/00000000-0000-0000-0000-000000000000", headers=auth_headers)
        assert resp.status_code == 404

    def test_data_isolation(self, client):
        """Different users should not see each other's clients."""
        from tests.conftest import _register_and_login
        headers_a = _register_and_login(client, "_iso_a")
        client.post("/api/v1/clients/", json={"name": "Private Client"}, headers=headers_a)

        headers_b = _register_and_login(client, "_iso_b")
        resp = client.get("/api/v1/clients/", headers=headers_b)
        names = [c["name"] for c in resp.json()["data"]["clients"]]
        assert "Private Client" not in names
