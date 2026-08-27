import requests

BASE_URL = "http://localhost:8000"

def test_api():
    print("--- 1. Testing GET /merchants ---")
    res = requests.get(f"{BASE_URL}/merchants")
    print(f"Status: {res.status_code}, Body: {res.json()}\n")
    merchant_id = res.json()[0]["id"]

    print("--- 2. Testing POST /catalog/items with Negative Price (-50.00) ---")
    payload_neg_price = {
        "merchant_id": merchant_id,
        "name": "Broken Price Product",
        "price": -50.00,
        "stock": 10,
        "category": "Electronics"
    }
    res = requests.post(f"{BASE_URL}/catalog/items", json=payload_neg_price)
    print(f"Status: {res.status_code} (Expected 422)")
    print(f"Detail: {res.json()}\n")

    print("--- 3. Testing POST /catalog/items with Non-existent Merchant ID ---")
    payload_bad_merchant = {
        "merchant_id": "00000000-0000-0000-0000-000000000000",
        "name": "Orphan Product",
        "price": 99.00,
        "stock": 10,
        "category": "Electronics"
    }
    res = requests.post(f"{BASE_URL}/catalog/items", json=payload_bad_merchant)
    print(f"Status: {res.status_code} (Expected 404)")
    print(f"Detail: {res.json()}\n")

    print("--- 4. Testing GET /merchants/00000000-0000-0000-0000-000000000000 (Non-existent) ---")
    res = requests.get(f"{BASE_URL}/merchants/00000000-0000-0000-0000-000000000000")
    print(f"Status: {res.status_code} (Expected 404)")
    print(f"Detail: {res.json()}\n")

if __name__ == "__main__":
    test_api()
