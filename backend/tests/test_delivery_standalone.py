import unittest
import uuid
from decimal import Decimal
from datetime import date, timedelta
from app.services.delivery_service import DeliveryService

class TestDeliveryCalculationSuite(unittest.TestCase):
    def test_01_default_shipping_calculation(self):
        """Standard default: 1 processing day + 4 shipping days = 5 days total lead time."""
        order_dt = date(2026, 9, 1)
        est = DeliveryService.calculate_delivery_date(None, category="Electronics", order_date=order_dt)
        self.assertEqual(est, order_dt + timedelta(days=5))

    def test_02_merchant_configured_lead_times(self):
        """Merchant config with custom processing (2 days) and shipping (3 days) = 5 days."""
        order_dt = date(2026, 9, 1)
        cfg = {
            "processing_days": 2,
            "standard_shipping_days": 3
        }
        est = DeliveryService.calculate_delivery_date(cfg, category="Fashion", order_date=order_dt)
        self.assertEqual(est, order_dt + timedelta(days=5))

    def test_03_per_category_overrides(self):
        """Category-specific shipping overrides take precedence over standard shipping."""
        order_dt = date(2026, 9, 1)
        cfg = {
            "processing_days": 1,
            "standard_shipping_days": 5,
            "per_category_overrides": {
                "Express Delivery": 1,
                "Heavy Appliances": 9
            }
        }
        # 1. Express Delivery: 1 processing + 1 override = 2 days
        est_exp = DeliveryService.calculate_delivery_date(cfg, category="Express Delivery", order_date=order_dt)
        self.assertEqual(est_exp, order_dt + timedelta(days=2))

        # 2. Heavy Appliances: 1 processing + 9 override = 10 days
        est_hvy = DeliveryService.calculate_delivery_date(cfg, category="Heavy Appliances", order_date=order_dt)
        self.assertEqual(est_hvy, order_dt + timedelta(days=10))

        # 3. Unlisted category: 1 processing + 5 standard = 6 days
        est_std = DeliveryService.calculate_delivery_date(cfg, category="Books", order_date=order_dt)
        self.assertEqual(est_std, order_dt + timedelta(days=6))

    def test_04_resilience_on_malformed_config(self):
        """Handles non-dict or invalid type inputs gracefully with default fallbacks."""
        order_dt = date(2026, 9, 1)
        bad_cfg = {
            "processing_days": "invalid",
            "standard_shipping_days": None,
            "per_category_overrides": "not_a_dict"
        }
        est = DeliveryService.calculate_delivery_date(bad_cfg, category="Gadgets", order_date=order_dt)
        # Sane fallback: 1 processing + 4 standard = 5 days
        self.assertEqual(est, order_dt + timedelta(days=5))

if __name__ == "__main__":
    unittest.main()
