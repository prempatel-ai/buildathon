import uuid
import pytest
from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.audit import AuditEvent
from app.services.audit_service import AuditService

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_merchant(db_session):
    merchant = Merchant(
        id=uuid.uuid4(),
        name="Audit Test Merchant Store",
        limits_config={}
    )
    db_session.add(merchant)
    db_session.commit()
    db_session.refresh(merchant)
    return merchant

def test_log_event_and_list_audit_events(db_session, test_merchant):
    ev1 = AuditService.log_event(
        db=db_session,
        actor_type="merchant",
        actor_id=str(test_merchant.id),
        action="catalog_item_created",
        input={"item_name": "Widget A", "price": 100},
        decision="N/A",
        reasoning="Created catalog item Widget A",
        merchant_id=test_merchant.id
    )

    ev2 = AuditService.log_event(
        db=db_session,
        actor_type="agent",
        actor_id="agent_007",
        action="policy_evaluated",
        input={"amount": 100},
        decision="ALLOW",
        reasoning="Within limit",
        merchant_id=test_merchant.id
    )

    items, total = AuditService.list_audit_events(
        db=db_session,
        merchant_id=test_merchant.id,
        sort_order="asc"
    )

    assert total >= 2
    item_ids = [item.id for item in items]
    assert ev1.id in item_ids
    assert ev2.id in item_ids

    # Verify chronological ordering (created_at strictly increasing or equal)
    idx1 = item_ids.index(ev1.id)
    idx2 = item_ids.index(ev2.id)
    assert idx1 < idx2

def test_audit_filtering_by_merchant_actor_and_action(db_session, test_merchant):
    unique_actor = f"unique_agent_{uuid.uuid4().hex[:6]}"
    unique_action = f"special_action_{uuid.uuid4().hex[:6]}"

    AuditService.log_event(
        db=db_session,
        actor_type="agent",
        actor_id=unique_actor,
        action=unique_action,
        input={"test": True},
        decision="ALLOW",
        reasoning="Filter test event",
        merchant_id=test_merchant.id
    )

    # Filter by actor_type
    items_actor, total_actor = AuditService.list_audit_events(
        db=db_session,
        actor_type="agent",
        merchant_id=test_merchant.id
    )
    assert total_actor >= 1
    assert any(i.actor_id == unique_actor for i in items_actor)

    # Filter by action
    items_action, total_action = AuditService.list_audit_events(
        db=db_session,
        action=unique_action,
        merchant_id=test_merchant.id
    )
    assert total_action == 1
    assert items_action[0].action == unique_action

def test_append_only_enforcement():
    # Verify AuditService exposes NO update or delete methods
    assert not hasattr(AuditService, "update_event")
    assert not hasattr(AuditService, "update_audit_event")
    assert not hasattr(AuditService, "delete_event")
    assert not hasattr(AuditService, "delete_audit_event")
