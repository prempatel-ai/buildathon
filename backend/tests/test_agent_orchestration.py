import pytest
import uuid
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.policy import Policy
from app.models.agent import PendingApproval
from app.agents.graph import run_agent_workflow
from app.services.audit_service import AuditService

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_agent_catalog_query(db_session):
    m = Merchant(name="Agent Test Merchant", limits_config={})
    db_session.add(m)
    db_session.commit()
    db_session.refresh(m)

    res = run_agent_workflow(
        merchant_id=str(m.id),
        agent_id="test_agent_01",
        prompt="What items are in stock?"
    )

    assert res["proposed_tool"] == "get_catalog"
    assert res["policy_decision"] == "ALLOW"
    assert res["status"] == "COMPLETED"

def test_agent_policy_gating_allow_and_deny(db_session):
    m = Merchant(name="Policy Gated Merchant", limits_config={})
    db_session.add(m)
    db_session.commit()
    db_session.refresh(m)

    # Set Max Amount Policy = 1000.00
    p = Policy(merchant_id=m.id, rule_type="max_amount", config={"max_amount": 1000.00})
    db_session.add(p)
    db_session.commit()

    # Prompt within limit -> ALLOW
    res_allow = run_agent_workflow(
        merchant_id=str(m.id),
        agent_id="test_agent_01",
        prompt="Please order item for 450 INR in Electronics"
    )
    assert res_allow["policy_decision"] == "ALLOW"
    assert res_allow["status"] == "PAYMENT_EXECUTED"
    assert res_allow["transaction_id"] is not None

    # Lower Max Amount Policy = 300.00
    p.config = {"max_amount": 300.00}
    db_session.commit()

    # Prompt over limit -> DENY
    res_deny = run_agent_workflow(
        merchant_id=str(m.id),
        agent_id="test_agent_01",
        prompt="Please order item for 450 INR in Electronics"
    )
    assert res_deny["policy_decision"] == "DENY"
    assert res_deny["status"] == "BLOCKED_BY_POLICY"
    assert res_deny.get("transaction_id") is None

def test_agent_needs_approval_interrupt(db_session):
    m = Merchant(name="Approval Gated Merchant", limits_config={})
    db_session.add(m)
    db_session.commit()
    db_session.refresh(m)

    # Set Policy with approval threshold = 200.00 and max_amount = 1000.00
    p = Policy(merchant_id=m.id, rule_type="max_amount", config={"max_amount": 1000.00, "approval_threshold": 200.00})
    db_session.add(p)
    db_session.commit()

    # Amount = 450.00 -> NEEDS_APPROVAL
    res_appr = run_agent_workflow(
        merchant_id=str(m.id),
        agent_id="test_agent_01",
        prompt="Order noise-canceling headphones for 450 INR"
    )

    assert res_appr["policy_decision"] == "NEEDS_APPROVAL"
    assert res_appr["status"] == "PAUSED_FOR_HUMAN_APPROVAL"
    assert res_appr.get("pending_approval_id") is not None

    # Verify PendingApproval record exists in DB
    pending = db_session.query(PendingApproval).filter(PendingApproval.merchant_id == m.id).first()
    assert pending is not None
    assert pending.status == "pending"

def test_agent_audit_attribution(db_session):
    m = Merchant(name="Audit Attribution Merchant", limits_config={})
    db_session.add(m)
    db_session.commit()
    db_session.refresh(m)

    agent_id = "agent_key_hash_999"
    run_agent_workflow(
        merchant_id=str(m.id),
        agent_id=agent_id,
        prompt="Show catalog"
    )

    events, total = AuditService.list_audit_events(db_session, merchant_id=m.id, actor_type="agent")
    assert total >= 1
    assert events[0].actor_id == agent_id
