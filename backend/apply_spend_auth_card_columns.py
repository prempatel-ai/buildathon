import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine

def add_columns():
    with engine.connect() as conn:
        print("Adding card_brand, card_last4, cardholder_name, vpa columns to spend_authorizations table...")
        conn.execute(text("ALTER TABLE spend_authorizations ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50) DEFAULT 'Visa';"))
        conn.execute(text("ALTER TABLE spend_authorizations ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4) DEFAULT '4242';"))
        conn.execute(text("ALTER TABLE spend_authorizations ADD COLUMN IF NOT EXISTS cardholder_name VARCHAR(255);"))
        conn.execute(text("ALTER TABLE spend_authorizations ADD COLUMN IF NOT EXISTS vpa VARCHAR(255);"))
        conn.commit()
        print("[SUCCESS] PostgreSQL columns added cleanly to spend_authorizations table!")

if __name__ == "__main__":
    add_columns()
