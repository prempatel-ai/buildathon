import pytest
import uuid
import hmac
import hashlib
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.merchant import Merchant
from app.models.agent import Agent
from app.models.webhook import WebhookEndpoint, WebhookDeliveryLog
from app.services.webhook_service import WebhookService

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_webhook_registration_and_hmac_signature(db_session):
    m = Merchant(
        id=uuid.uuid4(),
        name="Webhook Test Merchant",
        email=f"wh_{uuid.uuid4().hex[:6]}@store.com",
        password_hash="pwd"
    )
    db_session.add(m)
    db_session.commit()

    token = create_access_token({"sub": str(m.id), "email": m.email})
    headers = {"Authorization": f"Bearer {token}"}

    # Register webhook
    resp = client.post("/webhooks", json={
        "url": "https://example.com/webhook",
        "secret": "whsec_test12345"
    }, headers=headers)

    assert resp.status_code == 201
    ep_data = resp.json()
    assert ep_data["url"] == "https://example.com/webhook"
    assert ep_data["secret"] == "whsec_test12345"

    # Test HMAC signing function
    timestamp = 1700000000
    payload_str = '{"event":"test.ping"}'
    sig = WebhookService.sign_payload("whsec_test12345", timestamp, payload_str)
    assert sig.startswith("t=1700000000,v1=")

def test_webhook_delivery_retries_and_logging(db_session):
    m = Merchant(
        id=uuid.uuid4(),
        name="Retry Test Merchant",
        email=f"retry_{uuid.uuid4().hex[:6]}@store.com",
        password_hash="pwd"
    )
    db_session.add(m)
    db_session.commit()

    # Register webhook pointing to unreachable URL
    ep = WebhookEndpoint(
        id=uuid.uuid4(),
        merchant_id=m.id,
        url="http://127.0.0.1:9999/nonexistent-webhook",
        secret="whsec_retry999",
        is_active=True
    )
    db_session.add(ep)
    db_session.commit()

    log = WebhookService.dispatch_event(
        db=db_session,
        merchant_id=m.id,
        event_type="test.failure",
        payload={"event": "test.failure"}
    )

    assert log is not None
    assert log.status == "failed"
    assert log.attempts == 3
    assert log.response_status == 500

def test_sandbox_vs_live_environment_guard_rejection(db_session):
    # Live Merchant
    m_live = Merchant(
        id=uuid.uuid4(),
        name="Live Production Merchant",
        email=f"live_{uuid.uuid4().hex[:6]}@store.com",
        password_hash="pwd",
        environment="live"
    )
    db_session.add(m_live)
    db_session.commit()

    # Sandbox Agent Key
    raw_key = f"agent_key_{uuid.uuid4().hex[:12]}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    ag_sandbox = Agent(
        id=uuid.uuid4(),
        merchant_id=m_live.id,
        name="Sandbox Agent Key",
        api_key_hash=key_hash,
        scopes=["read_catalog", "propose_order"],
        environment="sandbox"
    )
    db_session.add(ag_sandbox)
    db_session.commit()

    # Attempt order proposal from Sandbox Agent Key against Live Merchant -> 403 Forbidden
    resp = client.post("/agent/chat", json={
        "merchant_id": str(m_live.id),
        "agent_id": raw_key,
        "prompt": "Order headphones for 200 INR"
    })

    assert resp.status_code == 403
    assert "Environment mismatch" in resp.json()["detail"]
