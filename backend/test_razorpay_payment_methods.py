import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_methods():
    order = client.order.create({
        "amount": 120000,
        "currency": "INR",
        "receipt": f"rcpt_methods_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Razorpay Order: {order_id}")

    # Method A: client.payment.createPaymentJson
    print("\nTesting client.payment.createPaymentJson...")
    try:
        res1 = client.payment.createPaymentJson({
            "amount": 120000,
            "currency": "INR",
            "order_id": order_id,
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "netbanking",
            "bank": "SBIN"
        })
        print(f"Result 1: {res1}")
    except Exception as e:
        print(f"Result 1 Error: {e}")

    # Method B: client.payment.createRecurring
    print("\nTesting client.payment.createRecurring...")
    try:
        res2 = client.payment.createRecurring({
            "amount": 120000,
            "currency": "INR",
            "order_id": order_id,
            "customer_id": "cust_TVc8IoLCKiF9r3",
            "token": "token_rzp_8f34efed709b",
            "email": "customer@example.com",
            "contact": "9876543210",
            "method": "card"
        })
        print(f"Result 2: {res2}")
    except Exception as e:
        print(f"Result 2 Error: {e}")

if __name__ == "__main__":
    test_methods()
