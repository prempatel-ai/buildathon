import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_checkout_mock():
    order = client.order.create({
        "amount": 10000,
        "currency": "INR",
        "receipt": f"rcpt_mock_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Order: {order_id}")

    key_id = settings.RAZORPAY_KEY_ID

    # Test 1: Razorpay public API POST /v1/payments
    # Form data payload used by Razorpay JS SDK
    form_data = {
        "key_id": key_id,
        "amount": "10000",
        "currency": "INR",
        "order_id": order_id,
        "email": "customer@example.com",
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "SBIN",
        "_": "12345"
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    print("\n--- Testing Form Data POST to https://api.razorpay.com/v1/payments ---")
    r1 = requests.post("https://api.razorpay.com/v1/payments", data=form_data, headers=headers)
    print(f"Status: {r1.status_code} | Body: {r1.text[:300]}")

    print("\n--- Testing JSON POST to https://api.razorpay.com/v1/payments ---")
    headers_json = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json"
    }
    r2 = requests.post("https://api.razorpay.com/v1/payments", json=form_data, headers=headers_json)
    print(f"Status: {r2.status_code} | Body: {r2.text[:300]}")

if __name__ == "__main__":
    test_checkout_mock()
