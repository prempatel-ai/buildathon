import sys
from app.core.database import SessionLocal
from app.schemas.merchant import MerchantCreate
from app.schemas.catalog import CatalogItemCreate
from app.services.merchant_service import MerchantService
from app.services.catalog_service import CatalogService

def run_seed():
    db = SessionLocal()
    try:
        print("Seeding demo merchant...")
        merchant = MerchantService.create_merchant(
            db,
            MerchantCreate(
                name="Apex Electronics & Gear",
                razorpay_key_id="rzp_test_demo12345",
                limits_config={
                    "max_transaction_amount": 50000,
                    "daily_spend_limit": 200000,
                    "allowed_categories": ["Electronics", "Accessories", "Gadgets"]
                }
            )
        )
        print(f"Created Merchant: '{merchant.name}' (ID: {merchant.id})")

        sample_items = [
            {"name": "UltraComfort Wireless Headphones", "price": 3499.00, "stock": 25, "category": "Electronics"},
            {"name": "Ergonomic Mechanical Keyboard", "price": 5999.00, "stock": 12, "category": "Electronics"},
            {"name": "USB-C Multi-Port Adapter Hub", "price": 1299.00, "stock": 40, "category": "Accessories"},
            {"name": "Smart Fitness Tracker Band", "price": 2499.00, "stock": 18, "category": "Gadgets"}
        ]

        print("Seeding catalog items...")
        for item_data in sample_items:
            item = CatalogService.create_catalog_item(
                db,
                CatalogItemCreate(
                    merchant_id=merchant.id,
                    name=item_data["name"],
                    price=item_data["price"],
                    stock=item_data["stock"],
                    category=item_data["category"]
                )
            )
            print(f" - Added item: '{item.name}' (Price: Rs.{item.price}, Stock: {item.stock})")

        print("\nSeed successful! Merchant ID:", merchant.id)
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
