"""Tests for invoice endpoints."""


class TestInvoices:
    def _create_paid_invoice(self, client, auth_headers, test_client_id):
        """Helper: create a task with client & rate, complete it to generate invoice."""
        import uuid
        task = client.post("/api/v1/tasks/", json={
            "title": f"Inv Test {uuid.uuid4().hex[:6]}",
            "client_id": test_client_id, "rate_type": "fixed", "rate": 200000
        }, headers=auth_headers)
        task_id = task.json()["data"]["id"]
        result = client.post(f"/api/v1/tasks/{task_id}/complete", headers=auth_headers)
        return result.json()["data"]["invoice"]

    def test_list_invoices(self, client, auth_headers):
        resp = client.get("/api/v1/invoices/", headers=auth_headers)
        assert resp.status_code == 200
        assert "invoices" in resp.json()["data"]

    def test_auto_generated_invoice(self, client, auth_headers, test_client_id):
        invoice = self._create_paid_invoice(client, auth_headers, test_client_id)
        assert invoice is not None
        assert invoice["status"] == "pending"
        assert invoice["amount"] == 200000
        assert invoice["invoice_number"].startswith("INV-")

    def test_public_invoice_view(self, client, auth_headers, test_client_id):
        invoice = self._create_paid_invoice(client, auth_headers, test_client_id)
        # Public endpoint — no auth needed
        resp = client.get(f"/api/v1/invoices/{invoice['id']}/public")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["invoice_number"] == invoice["invoice_number"]
        assert "client_name" in data
        assert "freelancer_name" in data

    def test_public_invoice_not_found(self, client):
        resp = client.get("/api/v1/invoices/00000000-0000-0000-0000-000000000000/public")
        assert resp.status_code == 404
