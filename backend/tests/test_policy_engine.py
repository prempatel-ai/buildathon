import uuid
import time
from decimal import Decimal
import pytest
import redis
from app.schemas.policy import ProposedAction, DecisionEnum
from app.policy.engine import evaluate
from app.policy.velocity import record_velocity_event, get_redis_client

@pytest.fixture
def merchant_id():
    return uuid.uuid4()

@pytest.fixture
def sample_policies():
    return [
        {
            "rule_type": "category_filter",
            "config": {
                "allowed_categories": ["Electronics", "Accessories", "Gadgets"],
                "blocked_categories": ["Gambling", "Crypto"]
            }
        },
        {
            "rule_type": "max_amount",
            "config": {
                "max_amount": 5000.0,
                "approval_threshold": 2000.0
            }
        },
        {
            "rule_type": "velocity_limit",
            "config": {
                "max_count": 3,
                "window_seconds": 10
            }
        }
    ]

@pytest.fixture
def redis_client():
    try:
        r = get_redis_client()
        r.ping()
        return r
    except Exception:
        pytest.skip("Live Redis server not available for test")

def test_within_limit_allow(merchant_id, sample_policies):
    action = ProposedAction(
        merchant_id=merchant_id,
        agent_id="agent_123",
        amount=Decimal("1500.00"),
        category="Electronics"
    )
    result = evaluate(action=action, policies=sample_policies)
    assert result.decision == DecisionEnum.ALLOW
    assert "passed all merchant policy checks" in result.reasoning
    assert result.triggered_rule is None

def test_over_max_amount_deny(merchant_id, sample_policies):
    action = ProposedAction(
        merchant_id=merchant_id,
        agent_id="agent_123",
        amount=Decimal("7500.00"),
        category="Electronics"
    )
    result = evaluate(action=action, policies=sample_policies)
    assert result.decision == DecisionEnum.DENY
    assert "exceeds merchant maximum single transaction limit of ₹5,000.00" in result.reasoning
    assert result.triggered_rule == "max_amount"

def test_blocked_category_deny(merchant_id, sample_policies):
    # Test blocked category
    action_blocked = ProposedAction(
        merchant_id=merchant_id,
        agent_id="agent_123",
        amount=Decimal("500.00"),
        category="Gambling"
    )
    result_blocked = evaluate(action=action_blocked, policies=sample_policies)
    assert result_blocked.decision == DecisionEnum.DENY
    assert "explicitly blocked by merchant policy" in result_blocked.reasoning
    assert result_blocked.triggered_rule == "category_filter"

    # Test category not in allowlist
    action_unallowed = ProposedAction(
        merchant_id=merchant_id,
        agent_id="agent_123",
        amount=Decimal("500.00"),
        category="Clothing"
    )
    result_unallowed = evaluate(action=action_unallowed, policies=sample_policies)
    assert result_unallowed.decision == DecisionEnum.DENY
    assert "not in the merchant's allowed categories list" in result_unallowed.reasoning
    assert result_unallowed.triggered_rule == "category_filter"

def test_grey_zone_needs_approval(merchant_id, sample_policies):
    action = ProposedAction(
        merchant_id=merchant_id,
        agent_id="agent_123",
        amount=Decimal("3500.00"),
        category="Electronics"
    )
    result = evaluate(action=action, policies=sample_policies)
    assert result.decision == DecisionEnum.NEEDS_APPROVAL
    assert "exceeds auto-approval threshold of ₹2,000.00" in result.reasoning
    assert result.triggered_rule == "max_amount_grey_zone"

def test_velocity_limit_exceeded_deny(merchant_id, sample_policies, redis_client):
    agent_id = f"test_agent_{uuid.uuid4().hex[:8]}"
    window_seconds = 10
    max_count = 3
    key = f"velocity:{merchant_id}:{agent_id}:{window_seconds}"

    # Ensure key is clean
    redis_client.delete(key)

    action = ProposedAction(
        merchant_id=merchant_id,
        agent_id=agent_id,
        amount=Decimal("500.00"),
        category="Electronics"
    )

    try:
        # Simulate 3 successful transactions
        for _ in range(max_count):
            res = evaluate(action=action, policies=sample_policies, redis_client=redis_client)
            assert res.decision == DecisionEnum.ALLOW
            record_velocity_event(redis_client, str(merchant_id), agent_id, window_seconds)

        # 4th transaction should exceed limit and DENY
        fourth_res = evaluate(action=action, policies=sample_policies, redis_client=redis_client)
        assert fourth_res.decision == DecisionEnum.DENY
        assert "Velocity limit exceeded" in fourth_res.reasoning
        assert fourth_res.triggered_rule == "velocity_limit"

        # Clear key (simulating window slide / expiry)
        redis_client.delete(key)

        # Should recover and ALLOW again
        recovered_res = evaluate(action=action, policies=sample_policies, redis_client=redis_client)
        assert recovered_res.decision == DecisionEnum.ALLOW

    finally:
        redis_client.delete(key)
