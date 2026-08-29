import os
import sys
import requests
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def print_methods():
    r = requests.get(f"https://api.razorpay.com/v1/methods?key_id={settings.RAZORPAY_KEY_ID}")
    print(f"Status: {r.status_code}")
    print(f"Body: {json.dumps(r.json(), indent=2)[:1500]}")

if __name__ == "__main__":
    print_methods()
