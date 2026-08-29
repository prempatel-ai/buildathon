import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def test_payment_link():
    # Create order
    order = client.order.create({
        "amount": 120000,
        "currency": "INR",
        "receipt": f"rcpt_link_{os.urandom(4).hex()}"
    })
    order_id = order["id"]
    print(f"Created Real Razorpay Order: {order_id}")

    # Create Payment Link for this order
    try:
        plink = client.payment_link.create({
            "amount": 120000,
            "currency": "INR",
            "accept_partial": False,
            "description": "AI Agent Purchase Test",
            "customer": {
                "name": "Prem Patel",
                "email": "customer@example.com",
                "contact": "+919876543210"
            },
            "notify": {
                "sms": False,
                "email": False
            },
            "reminder_enable": False,
            "notes": {
                "order_id": order_id
            }
        })

        print(f"REAL RAZORPAY PAYMENT LINK CREATED:")
        print(f"  - Payment Link ID : {plink['id']}")
        print(f"  - Short URL       : {plink['short_url']}")
        print(f"  - Status          : {plink['status']}")
    except Exception as e:
        print(f"Payment link creation error: {e}")

if __name__ == "__main__":
    test_payment_link()
