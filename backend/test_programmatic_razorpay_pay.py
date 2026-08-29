import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_programmatic_pay():
    # 1. Create order
    order = client.order.create({
        "amount": 10000, # 100 INR
        "currency": "INR",
        "receipt": f"rcpt_prog_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Order on Razorpay: {order_id}")

    # 2. Test programmatic payment authorization endpoints
    # Endpoint A: https://api.razorpay.com/v1/payments/pay/checkout
    # Endpoint B: https://api.razorpay.com/v1/payments/create/json
    # Endpoint C: https://api.razorpay.com/v1/payments
    
    key_id = settings.RAZORPAY_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET

    # Test basic auth vs key_id in body
    payload = {
        "key_id": key_id,
        "amount": 10000,
        "currency": "INR",
        "order_id": order_id,
        "email": "customer@example.com",
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "SBIN"
    }

    print("\n--- Trying POST https://api.razorpay.com/v1/payments/create/json with auth ---")
    r = requests.post("https://api.razorpay.com/v1/payments/create/json", json=payload, auth=(key_id, key_secret))
    print(f"Status: {r.status_code} | Response: {r.text[:300]}")

    print("\n--- Trying POST https://api.razorpay.com/v1/payments/pay/checkout with auth ---")
    r2 = requests.post("https://api.razorpay.com/v1/payments/pay/checkout", json=payload, auth=(key_id, key_secret))
    print(f"Status: {r2.status_code} | Response: {r2.text[:300]}")

    print("\n--- Trying POST https://api.razorpay.com/v1/payments/create with auth ---")
    r3 = requests.post("https://api.razorpay.com/v1/payments/create", json=payload, auth=(key_id, key_secret))
    print(f"Status: {r3.status_code} | Response: {r3.text[:300]}")

if __name__ == "__main__":
    test_programmatic_pay()
