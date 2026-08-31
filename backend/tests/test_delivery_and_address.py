import pytest
from datetime import date, timedelta
from app.services.delivery_service import DeliveryService

def test_delivery_service_default_config():
    today = date(2026, 9, 1)
    # Default processing: 1 day, default standard transit: 4 days -> Total 5 days
    est = DeliveryService.calculate_delivery_date(None, category="Electronics", order_date=today)
    assert est == today + timedelta(days=5)

def test_delivery_service_custom_merchant_config():
    today = date(2026, 9, 1)
    cfg = {
        "processing_days": 2,
        "standard_shipping_days": 3,
    }
    est = DeliveryService.calculate_delivery_date(cfg, category="Fashion", order_date=today)
    assert est == today + timedelta(days=5)

def test_delivery_service_category_override():
    today = date(2026, 9, 1)
    cfg = {
        "processing_days": 1,
        "standard_shipping_days": 5,
        "per_category_overrides": {
            "Groceries": 1,
            "Furniture": 10
        }
    }
    # Groceries: 1 + 1 = 2 days
    est_groc = DeliveryService.calculate_delivery_date(cfg, category="Groceries", order_date=today)
    assert est_groc == today + timedelta(days=2)

    # Furniture: 1 + 10 = 11 days
    est_furn = DeliveryService.calculate_delivery_date(cfg, category="Furniture", order_date=today)
    assert est_furn == today + timedelta(days=11)

    # Unlisted category (Electronics): uses standard 5 -> 1 + 5 = 6 days
    est_elec = DeliveryService.calculate_delivery_date(cfg, category="Electronics", order_date=today)
    assert est_elec == today + timedelta(days=6)
