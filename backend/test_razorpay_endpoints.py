import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_endpoints():
    order = client.order.create({
        "amount": 120000,
        "currency": "INR",
        "receipt": "rcpt_test_endpoints"
    })
    order_id = order["id"]
    print(f"Created Real Razorpay Order: {order_id}")

    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)

    # Endpoint candidate 1: Razorpay public API checkout / payment creation
    urls_to_test = [
        ("POST", "https://api.razorpay.com/v1/payments/pay/checkout", {
            "amount": 120000,
            "currency": "INR",
            "order_id": order_id,
            "email": "test@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "YESB"
        }),
        ("POST", "https://api.razorpay.com/v1/payments/create", {
            "amount": 120000,
            "currency": "INR",
            "order_id": order_id,
            "email": "test@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "YESB"
        }),
        ("POST", "https://api.razorpay.com/v1/payments", {
            "amount": 120000,
            "currency": "INR",
            "order_id": order_id,
            "email": "test@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "YESB"
        })
    ]

    for method, url, body in urls_to_test:
        try:
            r = requests.request(method, url, auth=auth, json=body)
            print(f"[{url}] Status: {r.status_code} | Body: {r.text[:250]}")
        except Exception as e:
            print(f"[{url}] Exception: {e}")

if __name__ == "__main__":
    test_endpoints()
