import uuid
import unittest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from app.core.database import Base
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.transaction import Transaction
from app.models.campaign_offer import CampaignOffer
from app.models.audit import AuditEvent
from app.services.campaign_service import CampaignService
from app.schemas.campaign_offer import MerchantCampaignPerformanceResponse

class TestAbandonmentCampaignOrchestratorSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.Session = sessionmaker(bind=cls.engine, autocommit=False, autoflush=False)

    def setUp(self):
        self.db = self.Session()

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    def test_01_abandonment_scan_creates_bounded_offer_for_unconverted_interest(self):
        """
        An unconverted shopping interest audit event older than N days creates a real campaign_offers row with explainable reason.
        """
        # 1. Create Merchant, Customer, Product
        m = Merchant(
            id=uuid.uuid4(),
            name="AudioStore Pro",
            email=f"audio_{uuid.uuid4().hex[:6]}@example.com",
            limits_config={"max_discount_pct": 15.0, "max_discount_amount": 500.0, "total_campaign_budget": 5000.0}
        )
        c = Customer(
            id=uuid.uuid4(),
            email=f"shopper_{uuid.uuid4().hex[:6]}@example.com",
            name="Rohan Verma",
            password_hash="pw"
        )
        it = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m.id,
            name="Sony WH-1000XM4 Noise Cancelling Headphones",
            price=Decimal("24999.00"),
            stock=10,
            category="Audio"
        )
        self.db.add_all([m, c, it])
        self.db.commit()

        # 2. Add Stale Audit Event (8 days ago)
        stale_time = datetime.now(timezone.utc) - timedelta(days=8)
        event = AuditEvent(
            id=uuid.uuid4(),
            merchant_id=m.id,
            actor_type="customer",
            actor_id=str(c.id),
            action="propose_order",
            input={"customer_id": str(c.id), "item_id": str(it.id), "item_name": it.name},
            decision="ALLOWED",
            reasoning=f"Customer proposed order for {it.name}",
            created_at=stale_time
        )
        self.db.add(event)
        self.db.commit()

        # 3. Run Scan with days_stale=7
        offers = CampaignService.scan_and_generate_abandonment_offers(self.db, days_stale=7)

        self.assertGreaterEqual(len(offers), 1)
        created_offer = self.db.query(CampaignOffer).filter(
            CampaignOffer.customer_id == c.id,
            CampaignOffer.source_item_id == it.id
        ).first()

        self.assertIsNotNone(created_offer)
        self.assertEqual(created_offer.status, "pending")
        self.assertIn("re-engagement discount", created_offer.reason)
        # Price cap applied: max discount 500.00
        self.assertEqual(float(created_offer.original_price), 24999.00)
        self.assertEqual(float(created_offer.discounted_price), 24499.00)

    def test_02_customer_with_settled_purchase_gets_zero_offers(self):
        """
        A customer who already completed a settled purchase gets zero abandonment offers.
        """
        m = Merchant(
            id=uuid.uuid4(),
            name="GadgetHub",
            email=f"gadget_{uuid.uuid4().hex[:6]}@example.com",
            limits_config={}
        )
        c = Customer(
            id=uuid.uuid4(),
            email=f"converted_{uuid.uuid4().hex[:6]}@example.com",
            name="Aarav Mehta",
            password_hash="pw"
        )
        it = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m.id,
            name="boAt Storm Smartwatch",
            price=Decimal("1999.00"),
            stock=15,
            category="Smartwatches"
        )
        self.db.add_all([m, c, it])
        self.db.commit()

        # Stale interest 10 days ago
        stale_time = datetime.now(timezone.utc) - timedelta(days=10)
        event = AuditEvent(
            id=uuid.uuid4(),
            merchant_id=m.id,
            actor_type="customer",
            actor_id=str(c.id),
            action="search_and_compare",
            input={"customer_id": str(c.id), "item_id": str(it.id)},
            decision="ALLOWED",
            reasoning="Searched smartwatch",
            created_at=stale_time
        )
        # Settled transaction 9 days ago
        tx = Transaction(
            id=uuid.uuid4(),
            merchant_id=m.id,
            amount=Decimal("1999.00"),
            status="SETTLED",
            created_at=stale_time + timedelta(days=1)
        )
        self.db.add_all([event, tx])
        self.db.commit()

        # Run scan
        offers = CampaignService.scan_and_generate_abandonment_offers(self.db, days_stale=7, force_generate_for_customer=str(c.id))
        self.assertEqual(len(offers), 0)

    def test_03_merchant_discount_caps_and_budget_are_enforced_and_clamped(self):
        """
        Discount amounts respect merchant limits (e.g. max 5% discount cap clamped).
        """
        m = Merchant(
            id=uuid.uuid4(),
            name="StrictBudget Store",
            email=f"strict_{uuid.uuid4().hex[:6]}@example.com",
            limits_config={"max_discount_pct": 5.0, "max_discount_amount": 100.0, "total_campaign_budget": 500.0}
        )
        c = Customer(
            id=uuid.uuid4(),
            email=f"buyer_{uuid.uuid4().hex[:6]}@example.com",
            name="Pooja Patel",
            password_hash="pw"
        )
        it = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m.id,
            name="Fitbit Charge 6",
            price=Decimal("14999.00"),
            stock=5,
            category="Fitness"
        )
        self.db.add_all([m, c, it])
        self.db.commit()

        stale_time = datetime.now(timezone.utc) - timedelta(days=9)
        event = AuditEvent(
            id=uuid.uuid4(),
            merchant_id=m.id,
            actor_type="customer",
            actor_id=str(c.id),
            action="propose_order",
            input={"customer_id": str(c.id), "item_id": str(it.id)},
            decision="ALLOWED",
            reasoning="Propose order",
            created_at=stale_time
        )
        self.db.add(event)
        self.db.commit()

        offers = CampaignService.scan_and_generate_abandonment_offers(self.db, days_stale=7, force_generate_for_customer=str(c.id))
        self.assertEqual(len(offers), 1)

        off = offers[0]
        # 5% max discount clamp applied = 100.0 max discount amount
        self.assertEqual(float(off.original_price), 14999.00)
        self.assertEqual(float(off.discounted_price), 14899.00) # 14999 - 100
        self.assertEqual(float(off.discount_value), 5.0)

    def test_04_offer_delivery_in_chat_and_conversion_on_settlement(self):
        """
        Pending offers are marked 'shown' when fetched for consumer chat, and marked 'converted' upon settlement.
        """
        m = Merchant(
            id=uuid.uuid4(),
            name="Volt Electronics",
            email=f"volt_{uuid.uuid4().hex[:6]}@example.com",
            limits_config={}
        )
        c = Customer(
            id=uuid.uuid4(),
            email=f"chat_shopper_{uuid.uuid4().hex[:6]}@example.com",
            name="Ananya Roy",
            password_hash="pw"
        )
        it = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m.id,
            name="Wireless Gaming Mouse",
            price=Decimal("2500.00"),
            stock=20,
            category="Gaming"
        )
        self.db.add_all([m, c, it])
        self.db.commit()

        offer = CampaignOffer(
            id=uuid.uuid4(),
            customer_id=c.id,
            merchant_id=m.id,
            source_item_id=it.id,
            discount_type="percentage",
            discount_value=Decimal("10.0"),
            original_price=Decimal("2500.00"),
            discounted_price=Decimal("2250.00"),
            reason="Special 10% re-engagement discount",
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(days=2)
        )
        self.db.add(offer)
        self.db.commit()

        # 1. Fetch pending offers (Simulating customer opening chat)
        pending_list = CampaignService.get_pending_offers_for_customer(self.db, customer_id=c.id)
        self.assertEqual(len(pending_list), 1)
        self.assertEqual(pending_list[0].item_name, "Wireless Gaming Mouse")

        # Status in DB should now be 'shown'
        refreshed_offer = self.db.query(CampaignOffer).filter(CampaignOffer.id == offer.id).first()
        self.assertEqual(refreshed_offer.status, "shown")

        # 2. Simulate settlement conversion
        tx = Transaction(
            id=uuid.uuid4(),
            merchant_id=m.id,
            amount=Decimal("2250.00"),
            status="SETTLED"
        )
        self.db.add(tx)
        self.db.commit()

        converted_offer = CampaignService.mark_offer_converted(self.db, offer_id=offer.id, transaction_id=tx.id)
        self.assertEqual(converted_offer.status, "converted")

    def test_05_merchant_campaign_performance_metrics_calculation(self):
        """
        GET /merchants/campaigns/performance returns exact computed metrics from real rows.
        """
        m = Merchant(
            id=uuid.uuid4(),
            name="Prime Performance Store",
            email=f"prime_{uuid.uuid4().hex[:6]}@example.com",
            limits_config={}
        )
        c1 = Customer(id=uuid.uuid4(), email=f"c1_{uuid.uuid4().hex[:6]}@example.com", name="User 1", password_hash="pw")
        c2 = Customer(id=uuid.uuid4(), email=f"c2_{uuid.uuid4().hex[:6]}@example.com", name="User 2", password_hash="pw")
        it = CatalogItem(id=uuid.uuid4(), merchant_id=m.id, name="Mechanical Keyboard", price=Decimal("4000.00"), stock=10, category="Tech")
        self.db.add_all([m, c1, c2, it])
        self.db.commit()

        # 1 Converted Offer (Discount ₹400, Revenue ₹3600)
        off1 = CampaignOffer(
            id=uuid.uuid4(),
            customer_id=c1.id,
            merchant_id=m.id,
            source_item_id=it.id,
            discount_type="percentage",
            discount_value=Decimal("10.0"),
            original_price=Decimal("4000.00"),
            discounted_price=Decimal("3600.00"),
            reason="Offer 1",
            status="converted",
            expires_at=datetime.now(timezone.utc) + timedelta(days=2)
        )
        # 1 Shown Offer (unconverted)
        off2 = CampaignOffer(
            id=uuid.uuid4(),
            customer_id=c2.id,
            merchant_id=m.id,
            source_item_id=it.id,
            discount_type="percentage",
            discount_value=Decimal("10.0"),
            original_price=Decimal("4000.00"),
            discounted_price=Decimal("3600.00"),
            reason="Offer 2",
            status="shown",
            expires_at=datetime.now(timezone.utc) + timedelta(days=2)
        )
        self.db.add_all([off1, off2])
        self.db.commit()

        tx1 = Transaction(
            id=uuid.uuid4(),
            merchant_id=m.id,
            source_campaign_offer_id=off1.id,
            amount=Decimal("3600.00"),
            status="SETTLED"
        )
        self.db.add(tx1)
        self.db.commit()

        perf: MerchantCampaignPerformanceResponse = CampaignService.get_merchant_campaign_performance(self.db, merchant_id=m.id)

        self.assertEqual(perf.offers_generated, 2)
        self.assertEqual(perf.offers_shown, 2)
        self.assertEqual(perf.offers_converted, 1)
        self.assertEqual(perf.conversion_rate, 50.0)
        self.assertEqual(perf.total_discount_given, 400.0)
        self.assertEqual(perf.total_attributed_revenue, 3600.0)

if __name__ == "__main__":
    unittest.main()
