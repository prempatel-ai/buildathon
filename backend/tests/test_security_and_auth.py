import pytest
import uuid
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.core.security import hash_password, verify_password, create_access_token
from app.models.merchant import Merchant
from app.models.agent import Agent

client = TestClient(app)

def test_password_hashing():
    pwd = "secret_merchant_password_123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_jwt_token_generation_and_decoding():
    merchant_id = str(uuid.uuid4())
    token = create_access_token({"sub": merchant_id, "email": "test@merchant.com"})
    assert isinstance(token, str)

def test_merchant_registration_and_login_flow():
    test_email = f"test_sec_{uuid.uuid4().hex[:6]}@store.com"
    reg_resp = client.post("/auth/register", json={
        "name": "Security Test Merchant",
        "email": test_email,
        "password": "Password123!"
    })
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    assert data["email"] == test_email

    # Login with valid credentials
    login_resp = client.post("/auth/login", json={
        "email": test_email,
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data

    from app.core.rate_limiter import redis_client
    for k in redis_client.keys("login_limit*"):
        redis_client.delete(k)

    # Login with invalid password
    bad_resp = client.post("/auth/login", json={
        "email": test_email,
        "password": "WrongPassword!"
    })
    assert bad_resp.status_code == 401

def test_agent_key_creation_rotation_and_scoping():
    db = SessionLocal()
    try:
        # Seed merchant
        merchant = Merchant(
            id=uuid.uuid4(),
            name="Agent Scope Test Merchant",
            email=f"agent_scope_{uuid.uuid4().hex[:6]}@store.com",
            password_hash=hash_password("password123")
        )
        db.add(merchant)
        db.commit()

        # Create agent key with only read_catalog scope
        key_resp = client.post("/agent/keys/create", json={
            "merchant_id": str(merchant.id),
            "name": "Read-Only Buyer Agent",
            "scopes": ["read_catalog"]
        })
        assert key_resp.status_code == 200
        key_data = key_resp.json()
        agent_id = key_data["agent_id"]
        api_key = key_data["api_key"]
        assert "read_catalog" in key_data["scopes"]

        # Attempt order proposal with read-only scope -> BLOCKED_BY_SCOPE
        chat_resp = client.post("/agent/chat", json={
            "merchant_id": str(merchant.id),
            "agent_id": api_key,
            "prompt": "Order wireless headphones for 200 INR"
        })
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        assert chat_data["status"] == "BLOCKED_BY_SCOPE"
        assert "lacks required scope" in chat_data["reasoning"]

        # Rotate Agent Key
        rot_resp = client.post(f"/agent/{agent_id}/rotate-key", json={"merchant_id": str(merchant.id)})
        assert rot_resp.status_code == 200
        rot_data = rot_resp.json()
        new_api_key = rot_data["new_api_key"]
        assert new_api_key != api_key

        # Old key returns 401 Unauthorized
        old_key_resp = client.post("/agent/chat", json={
            "merchant_id": str(merchant.id),
            "agent_id": api_key,
            "prompt": "What items are available?"
        })
        assert old_key_resp.status_code == 401
    finally:
        db.close()
