import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_form_payment():
    order = client.order.create({
        "amount": 50000,
        "currency": "INR",
        "receipt": f"rcpt_form_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Razorpay Order: {order_id}")

    url = "https://api.razorpay.com/v1/payments/create/json"
    form_data = {
        "amount": "50000",
        "currency": "INR",
        "order_id": order_id,
        "email": "customer@example.com",
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "SBIN"
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Origin": "https://api.razorpay.com",
        "Referer": "https://api.razorpay.com/"
    }

    # Test key auth
    resp = requests.post(url, data=form_data, headers=headers, auth=(settings.RAZORPAY_KEY_ID, ""))
    print(f"Form POST Status (key only): {resp.status_code}")
    print(f"Form POST Body: {resp.text[:500]}")

    if resp.status_code == 200:
        pid = resp.json().get("razorpay_payment_id") or resp.json().get("id")
        print(f"\nSUCCESS! CREATED REAL PAYMENT {pid} FOR ORDER {order_id}!")
        updated_order = client.order.fetch(order_id)
        print(f"UPDATED RAZORPAY ORDER STATUS: {updated_order.get('status')}")

if __name__ == "__main__":
    test_form_payment()
