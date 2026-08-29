import os
import sys
import requests
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def print_script():
    order = client.order.create({
        "amount": 50000,
        "currency": "INR",
        "receipt": f"rcpt_script_{os.urandom(4).hex()}"
    })
    order_id = order["id"]

    url = "https://api.razorpay.com/v1/payments"
    payload = {
        "key_id": settings.RAZORPAY_KEY_ID,
        "amount": 50000,
        "currency": "INR",
        "order_id": order_id,
        "email": "customer@example.com",
        "contact": "9876543210",
        "method": "netbanking",
        "bank": "YESB"
    }

    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://api.razorpay.com/",
        "Origin": "https://api.razorpay.com"
    }

    r = session.post(url, data=payload, headers=headers)
    print("HTML RESPONSE SCRIPTS:")
    scripts = re.findall(r'<script.*?>(.*?)</script>', r.text, re.DOTALL)
    for i, s in enumerate(scripts):
        print(f"\n--- Script {i+1} ---")
        print(s)

if __name__ == "__main__":
    print_script()
