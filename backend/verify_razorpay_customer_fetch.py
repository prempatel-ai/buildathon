import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
import razorpay

def verify_customer_tokenization_api():
    print("======================================================================")
    print("RAZORPAY CUSTOMER API CROSS-VERIFICATION & TOKENIZATION PROOF")
    print("======================================================================\n")

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    
    email = f"verified_cust_{os.urandom(3).hex()}@example.com"
    print("1. Issuing POST /v1/customers API request to Razorpay...")
    created_cust = client.customer.create({
        "name": "Audit Verification Consumer",
        "email": email,
        "contact": "9876543210"
    })

    cust_id = created_cust["id"]
    print(f"   [RAW RAZORPAY POST RESPONSE]:")
    print(json.dumps(created_cust, indent=2))
    print(f"\n   -> Generated Real Razorpay Customer ID: '{cust_id}'\n")

    print("2. Issuing GET /v1/customers/{id} fetch-back cross-verification call to Razorpay...")
    fetched_cust = client.customer.fetch(cust_id)

    print(f"   [RAW RAZORPAY GET RESPONSE]:")
    print(json.dumps(fetched_cust, indent=2))
    print(f"\n   [VERIFIED] Customer ID '{cust_id}' independently confirmed existing on Razorpay servers!")

    print("\n======================================================================")

if __name__ == "__main__":
    verify_customer_tokenization_api()
