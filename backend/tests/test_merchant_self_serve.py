import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionStatus

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_merchants_with_jwts(db_session):
    m_a = Merchant(
        id=uuid.uuid4(),
        name="Merchant A Store",
        email=f"merchant_a_{uuid.uuid4().hex[:6]}@store.com",
        password_hash="dummy_hash_a",
        limits_config={"max_transaction_amount": 1000.00}
    )
    m_b = Merchant(
        id=uuid.uuid4(),
        name="Merchant B Store",
        email=f"merchant_b_{uuid.uuid4().hex[:6]}@store.com",
        password_hash="dummy_hash_b",
        limits_config={"max_transaction_amount": 2000.00}
    )
    db_session.add_all([m_a, m_b])
    db_session.commit()
    db_session.refresh(m_a)
    db_session.refresh(m_b)

    jwt_a = create_access_token({"sub": str(m_a.id), "email": m_a.email})
    jwt_b = create_access_token({"sub": str(m_b.id), "email": m_b.email})

    return {
        "m_a": m_a, "jwt_a": jwt_a,
        "m_b": m_b, "jwt_b": jwt_b
    }

def test_merchant_settings_update_and_policy_reflection(db_session, test_merchants_with_jwts):
    m_a = test_merchants_with_jwts["m_a"]
    jwt_a = test_merchants_with_jwts["jwt_a"]
    headers_a = {"Authorization": f"Bearer {jwt_a}"}

    # Add catalog item priced at 500
    cat_item = CatalogItem(
        id=uuid.uuid4(),
        merchant_id=m_a.id,
        name="Bluetooth Speaker",
        price=Decimal("500.00"),
        stock=10,
        category="Electronics"
    )
    db_session.add(cat_item)
    db_session.commit()

    # Update settings via PUT /merchants/settings
    resp = client.put("/merchants/settings", json={
        "max_amount": 800.00,
        "velocity_limit": 10
    }, headers=headers_a)

    assert resp.status_code == 200
    data = resp.json()
    assert data["limits_config"]["max_transaction_amount"] == 800.00
    assert data["limits_config"]["velocity_limit"] == 10

def test_merchant_agent_creation_custom_scopes_and_gating(db_session, test_merchants_with_jwts):
    m_a = test_merchants_with_jwts["m_a"]
    jwt_a = test_merchants_with_jwts["jwt_a"]
    headers_a = {"Authorization": f"Bearer {jwt_a}"}

    # Create agent key with read_catalog scope ONLY
    resp = client.post("/merchants/agents", json={
        "name": "ReadOnly Inventory Agent",
        "scopes": ["read_catalog"]
    }, headers=headers_a)

    assert resp.status_code == 201
    ag_data = resp.json()
    assert ag_data["name"] == "ReadOnly Inventory Agent"
    assert ag_data["scopes"] == ["read_catalog"]
    assert ag_data["api_key"].startswith("agent_key_")

    # List agents
    list_resp = client.get("/merchants/agents", headers=headers_a)
    assert list_resp.status_code == 200
    agents_list = list_resp.json()
    assert any(a["name"] == "ReadOnly Inventory Agent" for a in agents_list)

def test_merchant_self_serve_multi_tenant_403_isolation(db_session, test_merchants_with_jwts):
    m_a = test_merchants_with_jwts["m_a"]
    m_b = test_merchants_with_jwts["m_b"]
    jwt_b = test_merchants_with_jwts["jwt_b"]
    headers_b = {"Authorization": f"Bearer {jwt_b}"}

    # Merchant B attempts to GET Merchant A details -> 403 Forbidden
    resp = client.get(f"/merchants/{m_a.id}", headers=headers_b)
    assert resp.status_code == 403
    assert "forbidden" in resp.json()["detail"].lower()

def test_merchant_usage_metrics_accounting(db_session, test_merchants_with_jwts):
    m_a = test_merchants_with_jwts["m_a"]
    jwt_a = test_merchants_with_jwts["jwt_a"]
    headers_a = {"Authorization": f"Bearer {jwt_a}"}

    # Add 2 settled transactions and 1 failed transaction for Merchant A
    tx1 = Transaction(id=uuid.uuid4(), merchant_id=m_a.id, amount=Decimal("100.00"), status=TransactionStatus.SETTLED.value)
    tx2 = Transaction(id=uuid.uuid4(), merchant_id=m_a.id, amount=Decimal("250.00"), status=TransactionStatus.SETTLED.value)
    tx3 = Transaction(id=uuid.uuid4(), merchant_id=m_a.id, amount=Decimal("500.00"), status=TransactionStatus.FAILED.value)
    db_session.add_all([tx1, tx2, tx3])
    db_session.commit()

    resp = client.get("/merchants/usage", headers=headers_a)
    assert resp.status_code == 200
    usage = resp.json()
    assert usage["total_transactions"] == 3
    assert usage["settled_transactions"] == 2
    assert usage["failed_transactions"] == 1
    assert usage["total_settled_volume"] == 350.00

def test_max_amount_cheapest_catalog_item_safety_net(db_session, test_merchants_with_jwts):
    m_a = test_merchants_with_jwts["m_a"]
    jwt_a = test_merchants_with_jwts["jwt_a"]
    headers_a = {"Authorization": f"Bearer {jwt_a}"}

    # Add cheapest item priced at 1200.00
    item = CatalogItem(
        id=uuid.uuid4(),
        merchant_id=m_a.id,
        name="4K Monitor",
        price=Decimal("1200.00"),
        stock=5,
        category="Electronics"
    )
    db_session.add(item)
    db_session.commit()

    # Attempt to set max_amount = 500.00 (lower than cheapest item 1200.00) -> 400 Bad Request
    resp = client.put("/merchants/settings", json={
        "max_amount": 500.00
    }, headers=headers_a)

    assert resp.status_code == 400
    assert "Validation Warning" in resp.json()["detail"]
