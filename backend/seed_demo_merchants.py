import os
import sys
import uuid
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.policy import Policy
from app.core.security import hash_password

def seed_demo_merchants():
    db = SessionLocal()
    try:
        demo_merchants_data = [
            {
                "name": "boAt Official Store",
                "email": "boat@demo.com",
                "item": {
                    "name": "boAt Rockerz 450 Wireless Headphones",
                    "price": Decimal("1200.00"),
                    "stock": 50,
                    "category": "Headphones"
                }
            },
            {
                "name": "JBL Audio India",
                "email": "jbl@demo.com",
                "item": {
                    "name": "JBL Tune 510BT Wireless Headphones",
                    "price": Decimal("2499.00"),
                    "stock": 30,
                    "category": "Headphones"
                }
            },
            {
                "name": "Sony Store Official",
                "email": "sony@demo.com",
                "item": {
                    "name": "Sony WH-CH520 Wireless Headphones",
                    "price": Decimal("3990.00"),
                    "stock": 20,
                    "category": "Headphones"
                }
            }
        ]

        seeded = []
        for m_data in demo_merchants_data:
            merchant = db.query(Merchant).filter(Merchant.email == m_data["email"]).first()
            if not merchant:
                merchant = Merchant(
                    name=m_data["name"],
                    email=m_data["email"],
                    password_hash=hash_password("DemoStore123!"),
                    limits_config={"max_transaction_amount": 10000.0, "daily_spend_limit": 50000.0},
                    environment="sandbox",
                    kyc_status="verified"
                )
                db.add(merchant)
                db.commit()
                db.refresh(merchant)

                # Add Policy
                policy = Policy(
                    merchant_id=merchant.id,
                    rule_type="max_amount",
                    config={"max_amount": 10000.00}
                )
                db.add(policy)

                # Add Catalog Item
                catalog_item = CatalogItem(
                    merchant_id=merchant.id,
                    name=m_data["item"]["name"],
                    price=m_data["item"]["price"],
                    stock=m_data["item"]["stock"],
                    category=m_data["item"]["category"]
                )
                db.add(catalog_item)
                db.commit()

            seeded.append({
                "merchant_id": str(merchant.id),
                "name": merchant.name,
                "email": merchant.email,
                "item": m_data["item"]["name"],
                "price": str(m_data["item"]["price"])
            })

        print("Successfully seeded 3 demo merchants:")
        for s in seeded:
            print(f" - {s['name']} (ID: {s['merchant_id']}) -> Item: '{s['item']}' @ INR {s['price']}")
        return seeded

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_merchants()
