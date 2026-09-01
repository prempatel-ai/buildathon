import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import pytest
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
from app.models.transaction import Transaction
from app.models.audit import AuditEvent
from app.models.campaign_offer import CampaignOffer
from app.models.recommendation import Recommendation
from app.models.catalog import CatalogItem
from app.models.policy import Policy
from app.models.agent import Agent
from app.models.spend_authorization import SpendAuthorization
from app.models.customer import Customer
from app.routers.merchant import (
    get_merchant_usage_metrics,
    get_merchant_timeline,
    get_merchant_agent_distribution,
    get_merchant_decision_breakdown
)

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

class TestMerchantAnalyticsSuite:

    def test_01_merchant_usage_metrics_case_insensitivity_and_volume(self, db_session):
        m_id = uuid.uuid4()
        merchant = Merchant(
            id=m_id,
            name="Test Store",
            email="analytics@store.dev",
            kyc_status="verified",
            environment="live"
        )
        db_session.add(merchant)

        # 1 settled (uppercase), 1 settled (lowercase), 1 failed
        db_session.add(Transaction(
            id=uuid.uuid4(),
            merchant_id=m_id,
            amount=Decimal("1500.00"),
            status="SETTLED"
        ))
        db_session.add(Transaction(
            id=uuid.uuid4(),
            merchant_id=m_id,
            amount=Decimal("2500.00"),
            status="settled"
        ))
        db_session.add(Transaction(
            id=uuid.uuid4(),
            merchant_id=m_id,
            amount=Decimal("500.00"),
            status="FAILED"
        ))
        db_session.commit()

        metrics = get_merchant_usage_metrics(current_merchant=merchant, db=db_session)
        assert metrics.total_transactions == 3
        assert metrics.settled_transactions == 2
        assert metrics.failed_transactions == 1
        assert metrics.total_settled_volume == 4000.0

    def test_02_merchant_timeline_bucketing_and_ranges(self, db_session):
        m_id = uuid.uuid4()
        merchant = Merchant(
            id=m_id,
            name="Timeline Store",
            email="timeline@store.dev",
            kyc_status="verified",
            environment="live"
        )
        db_session.add(merchant)

        now = datetime.now(timezone.utc)
        # Add tx today and tx 3 days ago
        db_session.add(Transaction(
            id=uuid.uuid4(),
            merchant_id=m_id,
            amount=Decimal("1200.00"),
            status="settled",
            created_at=now
        ))
        db_session.add(Transaction(
            id=uuid.uuid4(),
            merchant_id=m_id,
            amount=Decimal("800.00"),
            status="settled",
            created_at=now - timedelta(days=3)
        ))
        db_session.commit()

        # 7d
        timeline_7d = get_merchant_timeline(timeline_range="7d", current_merchant=merchant, db=db_session)
        assert len(timeline_7d) == 7
        total_val_7d = sum(p["value"] for p in timeline_7d)
        assert total_val_7d == 2000.0

        # 1d
        timeline_1d = get_merchant_timeline(timeline_range="1d", current_merchant=merchant, db=db_session)
        assert len(timeline_1d) == 7

        # 90d (12 weeks)
        timeline_90d = get_merchant_timeline(timeline_range="90d", current_merchant=merchant, db=db_session)
        assert len(timeline_90d) == 12
        total_val_90d = sum(p["value"] for p in timeline_90d)
        assert total_val_90d == 2000.0

    def test_03_merchant_agent_and_decision_distribution(self, db_session):
        m_id = uuid.uuid4()
        merchant = Merchant(
            id=m_id,
            name="Decision Store",
            email="decision@store.dev",
            kyc_status="verified",
            environment="live"
        )
        db_session.add(merchant)

        db_session.add(AuditEvent(
            id=uuid.uuid4(),
            merchant_id=m_id,
            actor_type="customer",
            actor_id="cust-1",
            action="propose_order",
            decision="ALLOWED",
            input={},
            reasoning="Passed Gate 1 and Gate 2"
        ))
        db_session.add(AuditEvent(
            id=uuid.uuid4(),
            merchant_id=m_id,
            actor_type="customer",
            actor_id="cust-1",
            action="propose_order",
            decision="DENIED",
            input={},
            reasoning="Exceeded max amount"
        ))
        db_session.commit()

        agent_dist = get_merchant_agent_distribution(current_merchant=merchant, db=db_session)
        assert len(agent_dist) >= 1
        assert agent_dist[0]["name"] == "ChatGPT Consumer AI"

        decision_dist = get_merchant_decision_breakdown(current_merchant=merchant, db=db_session)
        assert len(decision_dist) == 4
        settled_entry = next(d for d in decision_dist if d["name"] == "Settled")
        gated_entry = next(d for d in decision_dist if d["name"] == "Policy Gated")
        assert settled_entry["count"] >= 1
        assert gated_entry["count"] >= 1
