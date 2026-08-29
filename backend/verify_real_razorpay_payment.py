import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

def check_razorpay_payments():
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    
    print("Fetching payments from Razorpay test mode account...")
    payments = client.payment.all({"count": 5})
    print(f"Total payments returned: {len(payments.get('items', []))}")
    for item in payments.get("items", []):
        print(f"ID: {item['id']}, Status: {item['status']}, Captured: {item['captured']}, Amount: {item['amount']}, Order: {item.get('order_id')}")

    if payments.get("items"):
        pid = payments["items"][0]["id"]
        fetched = client.payment.fetch(pid)
        print("\nRAW GET /v1/payments/{id} RESPONSE FROM RAZORPAY:")
        print(json.dumps(fetched, indent=2))

if __name__ == "__main__":
    check_razorpay_payments()
