import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_make_order_paid():
    # 1. Create order on Razorpay
    order = client.order.create({
        "amount": 50000, # 500 INR in paise
        "currency": "INR",
        "receipt": f"rcpt_paid_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Razorpay Order: {order_id}")

    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    
    # Try netbanking method vs card method with auth
    payloads = [
        ("netbanking", {
            "amount": 50000,
            "currency": "INR",
            "order_id": order_id,
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "SBIN"
        }),
        ("card", {
            "amount": 50000,
            "currency": "INR",
            "order_id": order_id,
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "card",
            "card": {
                "name": "Prem Patel",
                "number": "4111111111111111",
                "cvv": "123",
                "expiry_month": "12",
                "expiry_year": "2030"
            }
        })
    ]

    for label, payload in payloads:
        print(f"\n--- Testing Method: {label} ---")
        resp = requests.post("https://api.razorpay.com/v1/payments/create/json", auth=auth, json=payload)
        print(f"Status Code: {resp.status_code}")
        print(f"Response Body: {resp.text[:400]}")

        if resp.status_code == 200:
            res_data = resp.json()
            payment_id = res_data.get("razorpay_payment_id") or res_data.get("id")
            print(f"SUCCESS! REAL PAYMENT CREATED ON RAZORPAY FOR ORDER {order_id}: {payment_id}")
            
            # Fetch order from Razorpay to confirm status is paid
            updated_order = client.order.fetch(order_id)
            print(f"UPDATED RAZORPAY ORDER STATUS: {updated_order.get('status')}")
            break

if __name__ == "__main__":
    test_make_order_paid()
