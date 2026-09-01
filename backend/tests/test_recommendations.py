import uuid
import unittest
from decimal import Decimal
from datetime import datetime, timezone
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
from app.models.recommendation import Recommendation
from app.models.audit import AuditEvent
from app.models.spend_authorization import SpendAuthorization
from app.services.recommendation_service import RecommendationService
from app.schemas.recommendation import MerchantRevenueAttributionResponse

class TestRecommendationEngineAndAttributionSuite(unittest.TestCase):
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

    def test_01_generate_explainable_post_purchase_recommendations(self):
        """
        After a settled purchase, 2-4 explainable recommendations are generated.
        Each recommendation carries a genuine, human-readable reason string.
        """
        # 1. Create Merchant & Customer
        m1 = Merchant(
            id=uuid.uuid4(),
            name="Boat Audio Store",
            email=f"boat_{uuid.uuid4().hex[:6]}@store.com",
            password_hash="hashed_pw",
            kyc_status="verified"
        )
        m2 = Merchant(
            id=uuid.uuid4(),
            name="Noise Wearables",
            email=f"noise_{uuid.uuid4().hex[:6]}@store.com",
            password_hash="hashed_pw",
            kyc_status="verified"
        )
        cust = Customer(
            id=uuid.uuid4(),
            name="Rahul Sharma",
            email=f"rahul_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hashed_pw"
        )
        self.db.add_all([m1, m2, cust])
        self.db.commit()

        # Add catalog items across categories
        item_audio = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m1.id,
            name="boAt Rockerz 450",
            price=Decimal("1499.00"),
            stock=25,
            category="Audio"
        )
        item_watch = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m2.id,
            name="Noise ColorFit Pro",
            price=Decimal("2199.00"),
            stock=15,
            category="Smartwatches"
        )
        item_audio_alt = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m1.id,
            name="boAt Airdopes 131",
            price=Decimal("999.00"),
            stock=40,
            category="Audio"
        )
        self.db.add_all([item_audio, item_watch, item_audio_alt])
        self.db.commit()

        # Create source transaction
        source_tx = Transaction(
            id=uuid.uuid4(),
            merchant_id=m1.id,
            amount=Decimal("1499.00"),
            status="SETTLED"
        )
        self.db.add(source_tx)
        self.db.commit()

        # Generate recommendations
        recs = RecommendationService.generate_post_purchase_recommendations(
            db=self.db,
            customer_id=cust.id,
            transaction_id=source_tx.id,
            purchased_item_name=item_audio.name,
            purchased_category=item_audio.category,
            purchased_amount=float(item_audio.price),
            purchased_merchant_id=m1.id,
            limit=3
        )

        self.assertGreaterEqual(len(recs), 2)
        self.assertLessEqual(len(recs), 4)

        for rec in recs:
            self.assertEqual(rec.customer_id, cust.id)
            self.assertEqual(rec.source_transaction_id, source_tx.id)
            self.assertEqual(rec.status, "shown")
            self.assertTrue(len(rec.reason) > 5, "Reason must be a descriptive string")
            self.assertNotEqual(rec.recommended_item_id, item_audio.id, "Never recommend exact same item purchased")

        # Verify recommendation_generated audit event exists
        audit = self.db.query(AuditEvent).filter(
            AuditEvent.action == "recommendation_generated",
            AuditEvent.decision == "GENERATED"
        ).order_by(AuditEvent.created_at.desc()).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.input["source_transaction_id"], str(source_tx.id))

    def test_02_recommendation_conversion_and_transaction_linking(self):
        """
        When a purchase is made using a source_recommendation_id,
        it links to the transaction and updates recommendation status to 'converted'.
        """
        m = Merchant(
            id=uuid.uuid4(),
            name="Apex Electronics",
            email=f"apex_{uuid.uuid4().hex[:6]}@store.com",
            password_hash="hashed",
            kyc_status="verified"
        )
        cust = Customer(
            id=uuid.uuid4(),
            name="Priya Patel",
            email=f"priya_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hashed"
        )
        item = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m.id,
            name="Apex Wireless Charger",
            price=Decimal("1299.00"),
            stock=10,
            category="Accessories"
        )
        self.db.add_all([m, cust, item])
        self.db.commit()

        # Initial source transaction & recommendation
        orig_tx = Transaction(id=uuid.uuid4(), merchant_id=m.id, amount=Decimal("2000.00"), status="SETTLED")
        self.db.add(orig_tx)
        self.db.commit()

        rec = Recommendation(
            id=uuid.uuid4(),
            customer_id=cust.id,
            source_transaction_id=orig_tx.id,
            recommended_item_id=item.id,
            recommended_merchant_id=m.id,
            reason="Frequently bought with smartphone purchases",
            status="shown"
        )
        self.db.add(rec)
        self.db.commit()

        # New purchase originating from this recommendation
        new_tx = Transaction(
            id=uuid.uuid4(),
            merchant_id=m.id,
            amount=Decimal("1299.00"),
            status="SETTLED",
            source_recommendation_id=rec.id,
            error_details={"item_name": item.name}
        )
        self.db.add(new_tx)
        self.db.commit()

        # Convert recommendation
        converted_rec = RecommendationService.mark_recommendation_converted(
            db=self.db,
            recommendation_id=rec.id,
            new_transaction_id=new_tx.id
        )

        self.assertIsNotNone(converted_rec)
        self.assertEqual(converted_rec.status, "converted")

        # Verify audit event
        audit = self.db.query(AuditEvent).filter(
            AuditEvent.action == "recommendation_converted",
            AuditEvent.decision == "CONVERTED"
        ).order_by(AuditEvent.created_at.desc()).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.input["recommendation_id"], str(rec.id))
        self.assertEqual(audit.input["converted_transaction_id"], str(new_tx.id))

    def test_03_exact_merchant_revenue_attribution_and_zero_false_attribution(self):
        """
        Revenue attribution aggregates only transactions with explicit source_recommendation_id.
        Purchases without source_recommendation_id never count toward attributed revenue.
        """
        m = Merchant(
            id=uuid.uuid4(),
            name="Zomato Provisions",
            email=f"zomato_{uuid.uuid4().hex[:6]}@store.com",
            password_hash="hashed",
            kyc_status="verified"
        )
        cust = Customer(
            id=uuid.uuid4(),
            name="Ananya Verma",
            email=f"ananya_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hashed"
        )
        self.db.add_all([m, cust])
        self.db.commit()

        # Create 4 recommendations shown for this merchant
        recs = []
        dummy_item = CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m.id,
            name="Organic Almonds",
            price=Decimal("450.00"),
            stock=100,
            category="Grocery"
        )
        self.db.add(dummy_item)
        self.db.commit()

        source_tx = Transaction(id=uuid.uuid4(), merchant_id=m.id, amount=Decimal("1000.00"), status="SETTLED")
        self.db.add(source_tx)
        self.db.commit()

        for _ in range(4):
            r = Recommendation(
                id=uuid.uuid4(),
                customer_id=cust.id,
                source_transaction_id=source_tx.id,
                recommended_item_id=dummy_item.id,
                recommended_merchant_id=m.id,
                reason="Trending grocery selection",
                status="shown"
            )
            self.db.add(r)
            recs.append(r)
        self.db.commit()

        # 1. Attributed Transaction 1: INR 450.00 (from recs[0])
        tx_attr_1 = Transaction(
            id=uuid.uuid4(),
            merchant_id=m.id,
            amount=Decimal("450.00"),
            status="SETTLED",
            source_recommendation_id=recs[0].id
        )
        recs[0].status = "converted"

        # 2. Attributed Transaction 2: INR 900.00 (from recs[1])
        tx_attr_2 = Transaction(
            id=uuid.uuid4(),
            merchant_id=m.id,
            amount=Decimal("900.00"),
            status="SETTLED",
            source_recommendation_id=recs[1].id
        )
        recs[1].status = "converted"

        # 3. Organic Unattributed Transaction: INR 5000.00 (NO source_recommendation_id)
        # MUST NEVER count towards attributed revenue!
        tx_organic = Transaction(
            id=uuid.uuid4(),
            merchant_id=m.id,
            amount=Decimal("5000.00"),
            status="SETTLED",
            source_recommendation_id=None
        )

        self.db.add_all([tx_attr_1, tx_attr_2, tx_organic])
        self.db.commit()

        # Calculate revenue attribution via service
        attr_res: MerchantRevenueAttributionResponse = RecommendationService.get_merchant_revenue_attribution(
            db=self.db,
            merchant_id=m.id
        )

        # Attributed revenue should be 450 + 900 = 1350.00 (NOT 6350.00)
        self.assertEqual(attr_res.total_attributed_revenue, 1350.00)
        self.assertEqual(attr_res.converted_recommendations_count, 2)
        self.assertEqual(attr_res.shown_recommendations_count, 4)
        self.assertEqual(attr_res.conversion_rate, 50.0)
        self.assertEqual(len(attr_res.attributed_transactions), 2)

if __name__ == "__main__":
    unittest.main()
