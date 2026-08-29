import uuid
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from main import app
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.policy import Policy
from app.models.customer import Customer
from app.models.spend_authorization import SpendAuthorization
from app.models.transaction import Transaction

client = TestClient(app)

def test_cross_merchant_search_read_only_isolation():
    db = SessionLocal()
    try:
        tx_count_before = db.query(Transaction).count()

        # Register consumer
        c_email = f"search_only_cust_{uuid.uuid4().hex[:6]}@example.com"
        c_res = client.post("/customer/auth/register", json={
            "name": "Search Only Consumer",
            "email": c_email,
            "password": "Password123!"
        })
        assert c_res.status_code == 201
        c_headers = {"Authorization": f"Bearer {c_res.json()['access_token']}"}

        # Issue cross-merchant search chat
        chat_res = client.post("/customer/chat", json={
            "prompt": "find cheap headphones"
        }, headers=c_headers)

        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert chat_data["proposed_tool"] == "search_and_compare"
        assert chat_data["search_results"] is not None
        assert len(chat_data["search_results"]) >= 1

        # Verify ZERO transactions created during search
        tx_count_after = db.query(Transaction).count()
        assert tx_count_before == tx_count_after, "Search alone created transactions!"
    finally:
        db.close()

def test_cross_merchant_multi_turn_confirmation_and_settlement():
    db = SessionLocal()
    try:
        # Register consumer & create spend authorization
        c_email = f"multi_turn_cust_{uuid.uuid4().hex[:6]}@example.com"
        c_res = client.post("/customer/auth/register", json={
            "name": "Multi Turn Consumer",
            "email": c_email,
            "password": "Password123!"
        })
        c_data = c_res.json()
        c_headers = {"Authorization": f"Bearer {c_data['access_token']}"}

        client.post("/customer/authorizations", json={
            "spend_limit": 5000.0,
            "period": "per_transaction"
        }, headers=c_headers)

        # Step 1: Search
        s_res = client.post("/customer/chat", json={
            "prompt": "find cheap headphones"
        }, headers=c_headers)
        assert s_res.status_code == 200
        thread_id = s_res.json()["thread_id"]
        assert s_res.json()["search_results"] is not None

        # Step 2: Confirm Purchase ("buy option 1")
        buy_res = client.post("/customer/chat", json={
            "prompt": "buy option 1",
            "thread_id": thread_id
        }, headers=c_headers)

        assert buy_res.status_code == 200
        buy_data = buy_res.json()
        assert buy_data["customer_auth_decision"] == "ALLOW"
        assert buy_data["policy_decision"] == "ALLOW"
        assert buy_data["status"] == "PAYMENT_EXECUTED"
        assert buy_data["razorpay_order_id"] is not None
    finally:
        db.close()
