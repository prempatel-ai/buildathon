import uuid
import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from app.core.database import Base
from app.models.merchant import Merchant
from app.models.policy import Policy
from app.models.agent import PendingApproval
from app.models.customer import Customer
from app.models.spend_authorization import SpendAuthorization
from app.models.address import Address
from app.models.catalog import CatalogItem
from app.agents.graph import run_agent_workflow, run_direct_purchase_workflow
from app.services.audit_service import AuditService

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_test_db(monkeypatch):
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr("app.core.database.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("app.agents.nodes.SessionLocal", TestingSessionLocal)
    
    yield
    
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def test_data():
    db = TestingSessionLocal()
    
    # 1. Create Merchant
    m_id = uuid.uuid4()
    m = Merchant(
        id=m_id,
        name="SoundHub Audio Store",
        email="soundhub@example.com",
        limits_config={"shipping_config": {"processing_days": 1, "standard_shipping_days": 3}}
    )
    db.add(m)
    
    # 2. Create Catalog Items
    c1 = CatalogItem(
        id=uuid.uuid4(),
        merchant_id=m_id,
        name="boAt Rockerz 450",
        category="Electronics",
        price=Decimal("1499.00"),
        stock=50
    )
    c2 = CatalogItem(
        id=uuid.uuid4(),
        merchant_id=m_id,
        name="boAt Airdopes 141",
        category="Electronics",
        price=Decimal("999.00"),
        stock=30
    )
    db.add_all([c1, c2])
    
    # 3. Create Customer with Active Spend Authorization and Address
    cust_id = uuid.uuid4()
    cust = Customer(
        id=cust_id,
        name="Rahul Sharma",
        email="rahul@example.com",
        password_hash="test_hash"
    )
    db.add(cust)
    db.commit()
    
    auth = SpendAuthorization(
        id=uuid.uuid4(),
        customer_id=cust_id,
        razorpay_customer_id="cust_test_123",
        spend_limit=Decimal("50000.00"),
        remaining_limit=Decimal("50000.00"),
        period="per_transaction",
        status="active"
    )
    addr = Address(
        id=uuid.uuid4(),
        customer_id=cust_id,
        recipient_name="Rahul Sharma",
        phone="+919876543210",
        line1="Flat 402, Lotus Heights",
        city="Bengaluru",
        state="Karnataka",
        postal_code="560001",
        is_default=True
    )
    db.add_all([auth, addr])
    db.commit()
    db.close()
    
    return {
        "merchant_id": m_id,
        "customer_id": cust_id
    }

def test_agent_catalog_query(test_data):
    """Verifies that catalog queries invoke get_catalog and return clean catalog items."""
    with patch("app.agents.nodes.get_groq_client") as mock_groq:
        mock_msg = MagicMock()
        mock_tc = MagicMock()
        mock_tc.function.name = "get_catalog"
        mock_tc.function.arguments = "{}"
        mock_msg.tool_calls = [mock_tc]
        mock_msg.content = None
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock(message=mock_msg)]
        mock_groq.return_value.chat.completions.create.return_value = mock_resp

        res = run_agent_workflow(
            merchant_id=str(test_data["merchant_id"]),
            agent_id="test_agent_01",
            prompt="What items are in stock?"
        )

        assert res["proposed_tool"] == "get_catalog"
        assert res["policy_decision"] == "ALLOW"
        assert res["status"] == "COMPLETED"
        assert len(res["catalog_results"]) == 2

def test_agent_policy_gating_allow_and_deny(test_data):
    """Verifies deterministic allow vs deny enforcement on policy threshold boundaries."""
    db = TestingSessionLocal()
    # Set Max Amount Policy = 1000.00
    p = Policy(
        id=uuid.uuid4(),
        merchant_id=test_data["merchant_id"],
        rule_type="max_amount",
        config={"max_amount": 1000.00}
    )
    db.add(p)
    db.commit()
    db.close()

    mock_tx = MagicMock()
    mock_tx.id = uuid.uuid4()
    mock_tx.razorpay_order_id = "order_mock_12345"
    mock_tx.status = "EXECUTING"

    with patch("app.services.payment_service.PaymentService.create_payment_order", return_value=mock_tx):
        # 1. Direct purchase within limit (450 INR) -> ALLOW
        res_allow = run_direct_purchase_workflow(
            merchant_id=str(test_data["merchant_id"]),
            item_name="boAt Airdopes 141",
            amount=450.00,
            category="Electronics",
            customer_id=str(test_data["customer_id"]),
            agent_id="test_agent_01"
        )
        assert res_allow["policy_decision"] == "ALLOW"
        assert res_allow["status"] in ["PAYMENT_SETTLED", "PAYMENT_EXECUTED"]
        assert res_allow["transaction_id"] is not None

    # 2. Direct purchase exceeding limit (1500 INR > 1000 INR cap) -> DENY
    res_deny = run_direct_purchase_workflow(
        merchant_id=str(test_data["merchant_id"]),
        item_name="boAt Rockerz 450",
        amount=1500.00,
        category="Electronics",
        customer_id=str(test_data["customer_id"]),
        agent_id="test_agent_01"
    )
    assert res_deny["policy_decision"] == "DENY"
    assert res_deny["status"] == "BLOCKED_BY_POLICY"

def test_agent_needs_approval_interrupt(test_data):
    """Verifies human-in-the-loop pause when transaction exceeds approval threshold."""
    db = TestingSessionLocal()
    # Set Policy: approval_threshold = 200.00, max_amount = 1000.00
    p = Policy(
        id=uuid.uuid4(),
        merchant_id=test_data["merchant_id"],
        rule_type="max_amount",
        config={"max_amount": 1000.00, "approval_threshold": 200.00}
    )
    db.add(p)
    db.commit()
    db.close()

    # Amount = 450.00 (Between 200 and 1000) -> NEEDS_APPROVAL
    res_appr = run_direct_purchase_workflow(
        merchant_id=str(test_data["merchant_id"]),
        item_name="boAt Rockerz 450",
        amount=450.00,
        category="Electronics",
        customer_id=str(test_data["customer_id"]),
        agent_id="test_agent_01"
    )

    assert res_appr["policy_decision"] == "NEEDS_APPROVAL"
    assert res_appr["status"] == "PAUSED_FOR_HUMAN_APPROVAL"
    assert res_appr.get("pending_approval_id") is not None

    db = TestingSessionLocal()
    pending = db.query(PendingApproval).filter(PendingApproval.merchant_id == test_data["merchant_id"]).first()
    assert pending is not None
    assert pending.status == "pending"
    db.close()

def test_agent_audit_attribution(test_data):
    """Verifies that agent actions are recorded with immutable audit attribution."""
    agent_id = "agent_key_hash_999"
    with patch("app.agents.nodes.get_groq_client") as mock_groq:
        mock_msg = MagicMock()
        mock_tc = MagicMock()
        mock_tc.function.name = "get_catalog"
        mock_tc.function.arguments = "{}"
        mock_msg.tool_calls = [mock_tc]
        mock_msg.content = None
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock(message=mock_msg)]
        mock_groq.return_value.chat.completions.create.return_value = mock_resp

        run_agent_workflow(
            merchant_id=str(test_data["merchant_id"]),
            agent_id=agent_id,
            prompt="Show catalog"
        )

    db = TestingSessionLocal()
    events, total = AuditService.list_audit_events(db, merchant_id=test_data["merchant_id"], actor_type="agent")
    assert total >= 1
    assert any(e.actor_id == agent_id for e in events)
    db.close()
