import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def verify_paid_order():
    order_id = "order_TVcZKNHB27NGjb"
    pay_id = "pay_TVcZN36UsIToU8"

    print("==================================================================")
    print("DIRECT RAZORPAY SERVER VERIFICATION")
    print("==================================================================")
    
    order = client.order.fetch(order_id)
    print(f"RAZORPAY ORDER '{order_id}':")
    print(f"  - Status       : {order['status']}")
    print(f"  - Amount Paid  : INR {order['amount_paid'] / 100:.2f}")
    print(f"  - Amount Due   : INR {order['amount_due'] / 100:.2f}")

    payment = client.payment.fetch(pay_id)
    print(f"\nRAZORPAY PAYMENT '{pay_id}':")
    print(f"  - Status       : {payment['status']}")
    print(f"  - Captured     : {payment.get('captured')}")
    print(f"  - Amount       : INR {payment['amount'] / 100:.2f}")
    print(f"  - Method       : {payment.get('method')}")
    print("==================================================================")

if __name__ == "__main__":
    verify_paid_order()
