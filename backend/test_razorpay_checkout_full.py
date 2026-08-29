import os
import sys
import requests
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_full_checkout():
    order = client.order.create({
        "amount": 10000,
        "currency": "INR",
        "receipt": f"rcpt_full_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Order: {order_id}")

    key_id = settings.RAZORPAY_KEY_ID

    form_data = {
        "key_id": key_id,
        "amount": 10000,
        "currency": "INR",
        "order_id": order_id,
        "email": "customer@example.com",
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "SBIN",
        "library": "checkoutjs",
        "version": "1.2.0"
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://api.razorpay.com/",
        "Origin": "https://api.razorpay.com"
    }

    session = requests.Session()
    r = session.post("https://api.razorpay.com/v1/payments", data=form_data, headers=headers)
    print(f"POST Status: {r.status_code}")
    
    matches = re.findall(r'pay_[A-Za-z0-9]{14}', r.text)
    print(f"Found matches: {matches}")

    # Check action attribute or form in HTML
    action_match = re.search(r'action="([^"]+)"', r.text)
    if action_match:
        print(f"Form Action URL: {action_match.group(1)}")

    if matches:
        pay_id = matches[0]
        print(f"REAL RAZORPAY PAYMENT ID: {pay_id}")
        
        # Check payment details on Razorpay API using SDK!
        p_details = client.payment.fetch(pay_id)
        print("FETCHED PAYMENT DETAILS FROM RAZORPAY:")
        print(json.dumps(p_details, indent=2))

if __name__ == "__main__":
    test_full_checkout()
