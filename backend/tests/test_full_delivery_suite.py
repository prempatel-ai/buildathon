import unittest
import uuid
from decimal import Decimal
from datetime import date, timedelta
from app.core.database import SessionLocal, Base, engine
from app.models.customer import Customer
from app.models.address import Address
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.spend_authorization import SpendAuthorization
from app.models.transaction import Transaction
from app.services.delivery_service import DeliveryService
from app.services.address_service import AddressService
from app.schemas.address import AddressCreate, AddressUpdate
from app.agents.graph import run_direct_purchase_workflow

class TestDeliveryAndAddressSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_delivery_service_pure_logic(self):
        """Test DeliveryService calculation with defaults, merchant configs, and category overrides."""
        today = date(2026, 9, 1)

        # 1. Default config: 1 day processing + 4 days transit = 5 days
        est_default = DeliveryService.calculate_delivery_date(None, category="Electronics", order_date=today)
        self.assertEqual(est_default, today + timedelta(days=5))

        # 2. Custom merchant config
        custom_cfg = {
            "processing_days": 2,
            "standard_shipping_days": 3,
            "per_category_overrides": {
                "Express": 1,
                "Heavy": 8
            }
        }
        # Standard category -> 2 + 3 = 5 days
        est_std = DeliveryService.calculate_delivery_date(custom_cfg, category="Fashion", order_date=today)
        self.assertEqual(est_std, today + timedelta(days=5))

        # Express category override -> 2 + 1 = 3 days
        est_exp = DeliveryService.calculate_delivery_date(custom_cfg, category="Express", order_date=today)
        self.assertEqual(est_exp, today + timedelta(days=3))

        # Heavy category override -> 2 + 8 = 10 days
        est_hvy = DeliveryService.calculate_delivery_date(custom_cfg, category="Heavy", order_date=today)
        self.assertEqual(est_hvy, today + timedelta(days=10))

    def test_02_address_service_crud_and_default_promotion(self):
        """Test customer-scoped address CRUD, default address management, and cascade/promotion."""
        # Create test customer
        cust = Customer(
            name="Address Test Customer",
            email=f"addr_test_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hashed_pw"
        )
        self.db.add(cust)
        self.db.commit()
        self.db.refresh(cust)

        # 1. Create first address (should automatically become default)
        addr1 = AddressService.create_address(self.db, cust.id, AddressCreate(
            label="Home",
            recipient_name="Prem Patel",
            phone="+919876543210",
            line1="123 Tech Park",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            country="IN",
            is_default=False
        ))
        self.assertTrue(addr1.is_default)

        # 2. Create second address with is_default=True (should unset addr1 default)
        addr2 = AddressService.create_address(self.db, cust.id, AddressCreate(
            label="Office",
            recipient_name="Prem Patel (Work)",
            phone="+919876543210",
            line1="456 Work Hub",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560038",
            country="IN",
            is_default=True
        ))
        self.db.refresh(addr1)
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)

        # 3. get_default_address
        def_addr = AddressService.get_default_address(self.db, cust.id)
        self.assertEqual(def_addr.id, addr2.id)

        # 4. update_address
        updated = AddressService.update_address(self.db, cust.id, addr1.id, AddressUpdate(label="Home Residence"))
        self.assertEqual(updated.label, "Home Residence")

        # 5. set_default
        AddressService.set_default(self.db, cust.id, addr1.id)
        self.db.refresh(addr1)
        self.db.refresh(addr2)
        self.assertTrue(addr1.is_default)
        self.assertFalse(addr2.is_default)

        # 6. delete_address
        AddressService.delete_address(self.db, cust.id, addr1.id)
        # addr2 should be promoted to default
        self.db.refresh(addr2)
        self.assertTrue(addr2.is_default)

    def test_03_agent_purchase_blocked_when_no_address(self):
        """Test fail-fast gating: Purchase without any address is rejected before policy/transaction creation."""
        # Create customer with active spend authorization BUT 0 addresses
        cust_no_addr = Customer(
            name="No Address Customer",
            email=f"no_addr_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hashed_pw"
        )
        self.db.add(cust_no_addr)
        self.db.commit()
        self.db.refresh(cust_no_addr)

        auth = SpendAuthorization(
            customer_id=cust_no_addr.id,
            razorpay_customer_id=f"cust_{uuid.uuid4().hex[:10]}",
            spend_limit=Decimal("5000.00"),
            remaining_limit=Decimal("5000.00"),
            period="per_transaction",
            status="active"
        )
        self.db.add(auth)
        self.db.commit()

        # Get or create demo merchant
        m = self.db.query(Merchant).first()
        if not m:
            m = Merchant(name="Demo Merchant", limits_config={})
            self.db.add(m)
            self.db.commit()
            self.db.refresh(m)

        # Count transactions before purchase attempt
        tx_count_before = self.db.query(Transaction).count()

        # Attempt direct purchase
        res = run_direct_purchase_workflow(
            merchant_id=str(m.id),
            item_name="Smart Watch",
            amount=1999.00,
            category="Electronics",
            customer_id=str(cust_no_addr.id),
            thread_id=f"thread_test_no_addr_{uuid.uuid4().hex[:6]}"
        )

        # Assert fail-fast rejection
        self.assertEqual(res.get("customer_auth_decision"), "DENY")
        self.assertEqual(res.get("status"), "BLOCKED_NO_DELIVERY_ADDRESS")
        self.assertIn("Delivery Address Required", res.get("response_message", ""))

        # Assert ZERO transactions were created
        tx_count_after = self.db.query(Transaction).count()
        self.assertEqual(tx_count_after, tx_count_before)

    def test_04_agent_purchase_success_with_address_and_delivery_date(self):
        """Test full settlement: Customer with address completes purchase with real estimated delivery date saved."""
        cust_valid = Customer(
            name="Valid Customer",
            email=f"valid_cust_{uuid.uuid4().hex[:6]}@example.com",
            password_hash="hashed_pw"
        )
        self.db.add(cust_valid)
        self.db.commit()
        self.db.refresh(cust_valid)

        # Add default address
        addr = AddressService.create_address(self.db, cust_valid.id, AddressCreate(
            label="Home",
            recipient_name="Valid Customer",
            phone="+919876543210",
            line1="77 Innovation Blvd",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560100",
            country="IN",
            is_default=True
        ))

        # Add active spend authorization
        auth = SpendAuthorization(
            customer_id=cust_valid.id,
            razorpay_customer_id=f"cust_{uuid.uuid4().hex[:10]}",
            spend_limit=Decimal("10000.00"),
            remaining_limit=Decimal("10000.00"),
            period="per_transaction",
            status="active"
        )
        self.db.add(auth)

        # Set merchant shipping config
        m = self.db.query(Merchant).first()
        m.limits_config = {
            "shipping_config": {
                "processing_days": 1,
                "standard_shipping_days": 3,
                "per_category_overrides": {"Smartphones": 2}
            }
        }
        self.db.commit()

        # Execute direct purchase
        res = run_direct_purchase_workflow(
            merchant_id=str(m.id),
            item_name="Noise Smartwatch",
            amount=2999.00,
            category="Electronics",
            customer_id=str(cust_valid.id),
            thread_id=f"thread_test_success_{uuid.uuid4().hex[:6]}"
        )

        self.assertEqual(res.get("customer_auth_decision"), "ALLOW")
        self.assertIn("Estimated Delivery", res.get("response_message", ""))
        self.assertIsNotNone(res.get("estimated_delivery_date"))
        self.assertIsNotNone(res.get("transaction_id"))

        # Verify transaction in DB has address_id and estimated_delivery_date
        tx_row = self.db.query(Transaction).filter(Transaction.id == uuid.UUID(res["transaction_id"])).first()
        self.assertIsNotNone(tx_row)
        self.assertEqual(tx_row.address_id, addr.id)
        self.assertIsNotNone(tx_row.estimated_delivery_date)

if __name__ == "__main__":
    unittest.main()
