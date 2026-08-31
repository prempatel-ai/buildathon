from datetime import date, timedelta
from typing import Dict, Any, Optional

class DeliveryService:
    DEFAULT_PROCESSING_DAYS = 1
    DEFAULT_STANDARD_SHIPPING_DAYS = 4

    @staticmethod
    def calculate_delivery_date(
        shipping_config: Optional[Dict[str, Any]],
        category: Optional[str] = None,
        order_date: Optional[date] = None
    ) -> date:
        """
        Pure, deterministic delivery date calculation:
        Estimated Delivery Date = order_date + processing_days + (category_override_days OR standard_shipping_days)
        """
        current_date = order_date or date.today()
        cfg = shipping_config or {}

        try:
            processing_days = int(cfg.get("processing_days", DeliveryService.DEFAULT_PROCESSING_DAYS))
        except (ValueError, TypeError):
            processing_days = DeliveryService.DEFAULT_PROCESSING_DAYS

        try:
            standard_shipping_days = int(cfg.get("standard_shipping_days", DeliveryService.DEFAULT_STANDARD_SHIPPING_DAYS))
        except (ValueError, TypeError):
            standard_shipping_days = DeliveryService.DEFAULT_STANDARD_SHIPPING_DAYS

        category_overrides = cfg.get("per_category_overrides") or {}
        shipping_transit_days = standard_shipping_days

        if category and isinstance(category_overrides, dict) and category in category_overrides:
            try:
                shipping_transit_days = int(category_overrides[category])
            except (ValueError, TypeError):
                shipping_transit_days = standard_shipping_days

        total_lead_time_days = max(1, processing_days + shipping_transit_days)
        return current_date + timedelta(days=total_lead_time_days)
