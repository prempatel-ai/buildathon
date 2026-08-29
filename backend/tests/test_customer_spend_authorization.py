import uuid
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app
from app.core.database import SessionLocal
from app.models.customer import Customer
from app.models.spend_authorization import SpendAuthorization
from app.models.merchant import Merchant
from app.models.audit import AuditEvent

client = TestClient(app)

def test_customer_registration_auth_and_spend_authorization():
    db = SessionLocal()
    try:
        email = f"test_cust_{uuid.uuid4().hex[:6]}@example.com"
        reg_res = client.post("/customer/auth/register", json={
            "name": "Test Consumer",
            "email": email,
            "password": "Password123!"
        })
        assert reg_res.status_code in (200, 201), reg_res.text
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        customer_id = reg_data["customer_id"]
        headers = {"Authorization": f"Bearer {reg_data['access_token']}"}

        # Create Spend Authorization
        auth_res = client.post("/customer/authorizations", json={
            "spend_limit": 5000.0,
            "period": "per_transaction"
        }, headers=headers)
        assert auth_res.status_code == 201, auth_res.text
        auth_data = auth_res.json()
        assert auth_data["spend_limit"] == "5000.00"
        assert auth_data["remaining_limit"] == "5000.00"
        assert auth_data["razorpay_customer_id"].startswith("cust_")
        assert auth_data["status"] == "active"

        # Fetch Dashboard
        dash_res = client.get("/customer/authorizations/me", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert dash_data["active_authorization"]["id"] == auth_data["id"]
    finally:
        db.close()

def test_customer_authorization_node_denial_gating():
    db = SessionLocal()
    try:
        # Register merchant
        m_email = f"merch_cust_gate_{uuid.uuid4().hex[:6]}@store.com"
        m_res = client.post("/auth/register", json={
            "name": "Customer Gate Store",
            "email": m_email,
            "password": "Password123!"
        })
        m_id = m_res.json()["merchant_id"]

        # Register customer and set spend limit of ₹1000
        c_email = f"cust_insufficient_{uuid.uuid4().hex[:6]}@example.com"
        c_res = client.post("/customer/auth/register", json={
            "name": "Low Balance Consumer",
            "email": c_email,
            "password": "Password123!"
        })
        c_id = c_res.json()["customer_id"]
        c_headers = {"Authorization": f"Bearer {c_res.json()['access_token']}"}

        client.post("/customer/authorizations", json={
            "spend_limit": 1000.0,
            "period": "per_transaction"
        }, headers=c_headers)

        # Propose order for ₹3000 (exceeding customer limit of ₹1000)
        chat_res = client.post("/agent/chat", json={
            "merchant_id": m_id,
            "agent_id": "buyer_agent_01",
            "customer_id": c_id,
            "prompt": "Order Mechanical Keyboard for 3000 INR"
        })
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert chat_data["customer_auth_decision"] == "DENY"
        assert chat_data["status"] == "BLOCKED_BY_CUSTOMER_AUTHORIZATION"
        assert "exceeds remaining spend limit" in chat_data["reasoning"]

        # Verify audit event carries actor_type="customer"
        audit = db.query(AuditEvent).filter(
            AuditEvent.actor_id == c_id,
            AuditEvent.action == "customer_authorization_evaluated"
        ).first()
        assert audit is not None
        assert audit.actor_type == "customer"
        assert audit.decision == "DENY"
    finally:
        db.close()
