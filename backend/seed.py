"""
Seed script: Inserts 25 realistic merchants with catalog items, agents, and policies.
Run: python seed.py  (from the backend/ directory)
Safe to run multiple times — skips already-existing emails.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import uuid
import hashlib
from app.core.config import settings
from app.core.database import SessionLocal, engine
import app.models  # noqa – registers all models with Base metadata
from app.models.merchant import Merchant
from app.models.agent import Agent
from app.models.catalog import CatalogItem
from app.models.policy import Policy

# ─── helpers ──────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = settings.SECRET_KEY.encode("utf-8")[:16]
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return pwd_hash.hex()

def make_api_key() -> tuple[str, str]:
    """Returns (raw_key, hashed_key)."""
    raw = f"agpay_{uuid.uuid4().hex}"
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed

# ─── merchant definitions ──────────────────────────────────────────────────────

MERCHANTS = [
    {
        "name": "Zomato Food Delivery",
        "email": "ops@zomato-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 5000, "daily_limit": 50000, "currency": "INR"},
        "catalog": [
            {"name": "Butter Chicken (500ml)", "price": 349.00, "stock": 200, "category": "food"},
            {"name": "Veg Thali", "price": 199.00, "stock": 300, "category": "food"},
            {"name": "Paneer Tikka (250g)", "price": 289.00, "stock": 150, "category": "food"},
            {"name": "Biryani (Full Plate)", "price": 399.00, "stock": 100, "category": "food"},
            {"name": "Mango Lassi (400ml)", "price": 89.00, "stock": 500, "category": "beverage"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 5000}},
            {"rule_type": "allowed_categories", "config": {"categories": ["food", "beverage"]}},
        ],
    },
    {
        "name": "Nykaa Beauty",
        "email": "merchant@nykaa-partner.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 15000, "daily_limit": 100000, "currency": "INR"},
        "catalog": [
            {"name": "Lakme Foundation SPF 24", "price": 699.00, "stock": 500, "category": "makeup"},
            {"name": "Mamaearth Vitamin C Serum", "price": 599.00, "stock": 800, "category": "skincare"},
            {"name": "Biotique Bio Honey Gel", "price": 199.00, "stock": 600, "category": "skincare"},
            {"name": "Maybelline Fit Me Concealer", "price": 399.00, "stock": 700, "category": "makeup"},
            {"name": "Wow Apple Cider Vinegar Shampoo", "price": 449.00, "stock": 400, "category": "haircare"},
            {"name": "Forest Essentials Face Mist", "price": 1295.00, "stock": 200, "category": "skincare"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 15000}},
            {"rule_type": "require_human_approval_above", "config": {"threshold": 10000}},
        ],
    },
    {
        "name": "Myntra Fashion",
        "email": "seller@myntra-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 20000, "daily_limit": 150000, "currency": "INR"},
        "catalog": [
            {"name": "Roadster Men's Slim Jeans", "price": 1299.00, "stock": 400, "category": "clothing"},
            {"name": "HRX Women's Sports Tee", "price": 699.00, "stock": 600, "category": "clothing"},
            {"name": "Puma Running Shoes (Size 9)", "price": 3499.00, "stock": 150, "category": "footwear"},
            {"name": "Sassafras Floral Midi Dress", "price": 1599.00, "stock": 200, "category": "clothing"},
            {"name": "Fossil Men's Chronograph Watch", "price": 8999.00, "stock": 50, "category": "accessories"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 20000}},
            {"rule_type": "blocked_categories", "config": {"categories": []}},
        ],
    },
    {
        "name": "Blinkit Grocery",
        "email": "store@blinkit-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 3000, "daily_limit": 30000, "currency": "INR"},
        "catalog": [
            {"name": "Amul Full Cream Milk (1L)", "price": 68.00, "stock": 1000, "category": "dairy"},
            {"name": "Tata Salt (1kg)", "price": 26.00, "stock": 2000, "category": "grocery"},
            {"name": "Britannia Whole Wheat Bread", "price": 55.00, "stock": 800, "category": "bakery"},
            {"name": "Mother Dairy Curd (400g)", "price": 44.00, "stock": 600, "category": "dairy"},
            {"name": "Lay's Classic Salted Chips (52g)", "price": 20.00, "stock": 1500, "category": "snacks"},
            {"name": "Aashirvaad Atta (5kg)", "price": 265.00, "stock": 400, "category": "grocery"},
            {"name": "Sunrise Mustard Oil (1L)", "price": 185.00, "stock": 300, "category": "grocery"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 3000}},
            {"rule_type": "max_items_per_order", "config": {"max_items": 20}},
        ],
    },
    {
        "name": "PharmEasy Pharmacy",
        "email": "pharmacy@pharmeasy-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 10000, "daily_limit": 50000, "currency": "INR"},
        "catalog": [
            {"name": "Crocin 500mg (10 tabs)", "price": 32.00, "stock": 5000, "category": "otc_medicine"},
            {"name": "Dolo 650 (15 tabs)", "price": 30.00, "stock": 4000, "category": "otc_medicine"},
            {"name": "Volini Pain Relief Spray (75g)", "price": 165.00, "stock": 1000, "category": "otc_medicine"},
            {"name": "Benadryl Cough Syrup (100ml)", "price": 90.00, "stock": 800, "category": "otc_medicine"},
            {"name": "Himalaya Liv.52 (100 tabs)", "price": 155.00, "stock": 600, "category": "supplements"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 10000}},
            {"rule_type": "require_prescription_check", "config": {"enabled": True}},
        ],
    },
    {
        "name": "Curefit Health & Fitness",
        "email": "partner@curefit-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 25000, "daily_limit": 100000, "currency": "INR"},
        "catalog": [
            {"name": "Cult.fit Monthly Pass", "price": 2499.00, "stock": 999, "category": "subscription"},
            {"name": "Whey Protein Chocolate (1kg)", "price": 1999.00, "stock": 300, "category": "nutrition"},
            {"name": "Yoga Mat (6mm)", "price": 799.00, "stock": 200, "category": "equipment"},
            {"name": "Resistance Bands Set", "price": 599.00, "stock": 400, "category": "equipment"},
            {"name": "Eat.fit Protein Bowl (350g)", "price": 249.00, "stock": 500, "category": "food"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 25000}},
            {"rule_type": "allowed_categories", "config": {"categories": ["subscription", "nutrition", "equipment", "food"]}},
        ],
    },
    {
        "name": "Boat Lifestyle Electronics",
        "email": "sales@boat-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 30000, "daily_limit": 200000, "currency": "INR"},
        "catalog": [
            {"name": "boAt Airdopes 141 TWS", "price": 1299.00, "stock": 500, "category": "audio"},
            {"name": "boAt Rockerz 255 Pro+", "price": 1799.00, "stock": 400, "category": "audio"},
            {"name": "boAt Stone 352 Bluetooth Speaker", "price": 2499.00, "stock": 300, "category": "audio"},
            {"name": "boAt Wave Horizon Smartwatch", "price": 2499.00, "stock": 250, "category": "wearables"},
            {"name": "boAt Bassheads 242 Wired", "price": 349.00, "stock": 1000, "category": "audio"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 30000}},
            {"rule_type": "require_human_approval_above", "config": {"threshold": 20000}},
        ],
    },
    {
        "name": "Lenskart Eyewear",
        "email": "retail@lenskart-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 8000, "daily_limit": 60000, "currency": "INR"},
        "catalog": [
            {"name": "Vincent Chase Aviators (Gold)", "price": 1299.00, "stock": 300, "category": "sunglasses"},
            {"name": "John Jacobs Rectangular Frame", "price": 1999.00, "stock": 400, "category": "eyeglasses"},
            {"name": "Lenskart Blue Cut Lens Upgrade", "price": 499.00, "stock": 999, "category": "lens_upgrade"},
            {"name": "Oakley Sports Polarised", "price": 4999.00, "stock": 100, "category": "sunglasses"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 8000}},
        ],
    },
    {
        "name": "Dunzo Hyperlocal Delivery",
        "email": "ops@dunzo-merchant.com",
        "kyc_status": "pending",
        "environment": "sandbox",
        "limits_config": {"max_order_amount": 2000, "daily_limit": 20000, "currency": "INR"},
        "catalog": [
            {"name": "Express Grocery Delivery (< 3km)", "price": 29.00, "stock": 999, "category": "delivery_fee"},
            {"name": "Express Grocery Delivery (3-7km)", "price": 49.00, "stock": 999, "category": "delivery_fee"},
            {"name": "Package Pickup & Drop", "price": 99.00, "stock": 999, "category": "delivery_fee"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 2000}},
        ],
    },
    {
        "name": "MakeMyTrip Travel",
        "email": "b2b@makemytrip-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 200000, "daily_limit": 500000, "currency": "INR"},
        "catalog": [
            {"name": "Economy Flight Booking (Domestic)", "price": 4500.00, "stock": 999, "category": "flights"},
            {"name": "Business Class Upgrade", "price": 18000.00, "stock": 200, "category": "flights"},
            {"name": "3-Star Hotel Night (Metro City)", "price": 3500.00, "stock": 500, "category": "hotels"},
            {"name": "5-Star Hotel Night (Metro City)", "price": 12000.00, "stock": 100, "category": "hotels"},
            {"name": "Goa Holiday Package (3N/4D)", "price": 18999.00, "stock": 50, "category": "holiday_packages"},
            {"name": "Travel Insurance (7 days)", "price": 299.00, "stock": 999, "category": "insurance"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 200000}},
            {"rule_type": "require_human_approval_above", "config": {"threshold": 50000}},
        ],
    },
    {
        "name": "Razorpay Software",
        "email": "saas@razorpay-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 50000, "daily_limit": 300000, "currency": "INR"},
        "catalog": [
            {"name": "Razorpay Starter Plan (Monthly)", "price": 0.00, "stock": 999, "category": "saas"},
            {"name": "Razorpay Growth Plan (Monthly)", "price": 1999.00, "stock": 999, "category": "saas"},
            {"name": "Razorpay Enterprise Plan (Monthly)", "price": 9999.00, "stock": 100, "category": "saas"},
            {"name": "Payment Pages (One-time setup)", "price": 4999.00, "stock": 999, "category": "saas"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 50000}},
        ],
    },
    {
        "name": "Urban Company Home Services",
        "email": "partner@urbancompany-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 10000, "daily_limit": 80000, "currency": "INR"},
        "catalog": [
            {"name": "Full Home Deep Cleaning (2BHK)", "price": 2499.00, "stock": 50, "category": "cleaning"},
            {"name": "AC Service & Gas Refill", "price": 999.00, "stock": 100, "category": "appliance_repair"},
            {"name": "Electrician Visit + Minor Fixes", "price": 299.00, "stock": 200, "category": "electrician"},
            {"name": "Plumber Emergency Call", "price": 349.00, "stock": 200, "category": "plumber"},
            {"name": "Women's Facial (60 min)", "price": 799.00, "stock": 150, "category": "beauty"},
            {"name": "Men's Grooming Package", "price": 599.00, "stock": 150, "category": "beauty"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 10000}},
            {"rule_type": "allowed_categories", "config": {"categories": ["cleaning", "appliance_repair", "electrician", "plumber", "beauty"]}},
        ],
    },
    {
        "name": "Meesho Social Commerce",
        "email": "reseller@meesho-merchant.com",
        "kyc_status": "pending",
        "environment": "sandbox",
        "limits_config": {"max_order_amount": 5000, "daily_limit": 40000, "currency": "INR"},
        "catalog": [
            {"name": "Women's Kurti (M/L/XL)", "price": 349.00, "stock": 1000, "category": "clothing"},
            {"name": "Men's Formal Shirt", "price": 299.00, "stock": 800, "category": "clothing"},
            {"name": "Stainless Steel Tiffin Box Set", "price": 449.00, "stock": 600, "category": "kitchen"},
            {"name": "Printed Cotton Bedsheet (Double)", "price": 599.00, "stock": 400, "category": "home_furnishing"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 5000}},
        ],
    },
    {
        "name": "BYJU'S EdTech",
        "email": "subscriptions@byjus-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 100000, "daily_limit": 500000, "currency": "INR"},
        "catalog": [
            {"name": "BYJU'S Class 6-10 Annual Pack", "price": 24999.00, "stock": 999, "category": "education"},
            {"name": "BYJU'S JEE Prep Annual", "price": 45000.00, "stock": 500, "category": "education"},
            {"name": "BYJU'S NEET Prep Annual", "price": 42000.00, "stock": 500, "category": "education"},
            {"name": "BYJU'S IAS Prep Annual", "price": 60000.00, "stock": 200, "category": "education"},
            {"name": "Tablet + Course Bundle", "price": 35000.00, "stock": 100, "category": "education"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 100000}},
            {"rule_type": "require_human_approval_above", "config": {"threshold": 30000}},
        ],
    },
    {
        "name": "Ola Cabs Mobility",
        "email": "fleet@ola-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 5000, "daily_limit": 20000, "currency": "INR"},
        "catalog": [
            {"name": "Ola Mini (per km base)", "price": 89.00, "stock": 999, "category": "ride"},
            {"name": "Ola Prime Sedan", "price": 149.00, "stock": 999, "category": "ride"},
            {"name": "Ola Auto", "price": 49.00, "stock": 999, "category": "ride"},
            {"name": "Ola Bike", "price": 29.00, "stock": 999, "category": "ride"},
            {"name": "Ola Outstation (per km)", "price": 14.00, "stock": 999, "category": "outstation"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 5000}},
        ],
    },
    {
        "name": "Zepto Quick Commerce",
        "email": "ops@zepto-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 4000, "daily_limit": 35000, "currency": "INR"},
        "catalog": [
            {"name": "Red Bull Energy Drink (250ml)", "price": 125.00, "stock": 800, "category": "beverages"},
            {"name": "Maggi 2-Minute Noodles (12-pack)", "price": 168.00, "stock": 600, "category": "instant_food"},
            {"name": "Parle-G Glucose Biscuits (799g)", "price": 65.00, "stock": 1000, "category": "snacks"},
            {"name": "Real Fruit Juice Mixed (1L)", "price": 130.00, "stock": 500, "category": "beverages"},
            {"name": "Dark Fantasy Choco Fills", "price": 45.00, "stock": 800, "category": "snacks"},
            {"name": "Haldiram's Aloo Bhujia (400g)", "price": 115.00, "stock": 700, "category": "snacks"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 4000}},
            {"rule_type": "max_items_per_order", "config": {"max_items": 15}},
        ],
    },
    {
        "name": "Pepperfry Home Furniture",
        "email": "orders@pepperfry-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 200000, "daily_limit": 1000000, "currency": "INR"},
        "catalog": [
            {"name": "3-Seater Fabric Sofa (Grey)", "price": 22999.00, "stock": 30, "category": "furniture"},
            {"name": "King Size Bed (Walnut)", "price": 34999.00, "stock": 20, "category": "furniture"},
            {"name": "Study Table with Shelf", "price": 7999.00, "stock": 50, "category": "furniture"},
            {"name": "Ergonomic Office Chair", "price": 12999.00, "stock": 40, "category": "furniture"},
            {"name": "Wardrobe 3-Door (White)", "price": 18999.00, "stock": 25, "category": "furniture"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 200000}},
            {"rule_type": "require_human_approval_above", "config": {"threshold": 50000}},
        ],
    },
    {
        "name": "Country Delight Dairy",
        "email": "subscriptions@countrydelight-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 3000, "daily_limit": 20000, "currency": "INR"},
        "catalog": [
            {"name": "Full Cream Milk Daily Sub (1L/day)", "price": 78.00, "stock": 999, "category": "dairy"},
            {"name": "A2 Cow Ghee (500ml)", "price": 599.00, "stock": 300, "category": "dairy"},
            {"name": "Fresh Paneer (200g)", "price": 99.00, "stock": 500, "category": "dairy"},
            {"name": "Greek Yogurt Strawberry (200g)", "price": 79.00, "stock": 400, "category": "dairy"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 3000}},
        ],
    },
    {
        "name": "Vahdam Teas",
        "email": "wholesale@vahdam-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 15000, "daily_limit": 80000, "currency": "INR"},
        "catalog": [
            {"name": "Darjeeling First Flush (100g)", "price": 799.00, "stock": 400, "category": "tea"},
            {"name": "Assam TGFOP Loose Leaf (250g)", "price": 549.00, "stock": 600, "category": "tea"},
            {"name": "Turmeric Ginger Herbal Tea (30 bags)", "price": 449.00, "stock": 800, "category": "tea"},
            {"name": "Masala Chai Blend (200g)", "price": 349.00, "stock": 700, "category": "tea"},
            {"name": "Green Tea Himalayan (100g)", "price": 599.00, "stock": 500, "category": "tea"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 15000}},
        ],
    },
    {
        "name": "Bewakoof Fashion",
        "email": "marketplace@bewakoof-merchant.com",
        "kyc_status": "pending",
        "environment": "sandbox",
        "limits_config": {"max_order_amount": 5000, "daily_limit": 30000, "currency": "INR"},
        "catalog": [
            {"name": "Graphic Tee (Unisex)", "price": 399.00, "stock": 1500, "category": "clothing"},
            {"name": "Jogger Pants (Cotton)", "price": 799.00, "stock": 800, "category": "clothing"},
            {"name": "Oversized Hoodie", "price": 999.00, "stock": 600, "category": "clothing"},
            {"name": "Casual Shorts", "price": 499.00, "stock": 1000, "category": "clothing"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 5000}},
        ],
    },
    {
        "name": "Licious Fresh Meat",
        "email": "supply@licious-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 5000, "daily_limit": 40000, "currency": "INR"},
        "catalog": [
            {"name": "Chicken Breast Boneless (500g)", "price": 249.00, "stock": 400, "category": "poultry"},
            {"name": "Whole Chicken Cleaned (1kg)", "price": 349.00, "stock": 300, "category": "poultry"},
            {"name": "Salmon Fillet Norwegian (400g)", "price": 899.00, "stock": 100, "category": "seafood"},
            {"name": "Mutton Curry Cut (500g)", "price": 549.00, "stock": 200, "category": "mutton"},
            {"name": "Prawns Medium (500g)", "price": 449.00, "stock": 150, "category": "seafood"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 5000}},
            {"rule_type": "allowed_categories", "config": {"categories": ["poultry", "seafood", "mutton"]}},
        ],
    },
    {
        "name": "Noise Smartwear",
        "email": "b2b@noise-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 20000, "daily_limit": 100000, "currency": "INR"},
        "catalog": [
            {"name": "Noise ColorFit Pro 4 Smartwatch", "price": 4499.00, "stock": 300, "category": "wearables"},
            {"name": "Noise Buds VS104 TWS", "price": 1499.00, "stock": 500, "category": "audio"},
            {"name": "Noise Shots X5 Pro Neckband", "price": 1999.00, "stock": 400, "category": "audio"},
            {"name": "Noise Evolve 2 Max Smartwatch", "price": 2999.00, "stock": 250, "category": "wearables"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 20000}},
        ],
    },
    {
        "name": "Sugar Cosmetics",
        "email": "retail@sugar-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 8000, "daily_limit": 50000, "currency": "INR"},
        "catalog": [
            {"name": "SUGAR Matte Attack Lipstick", "price": 699.00, "stock": 600, "category": "makeup"},
            {"name": "SUGAR Contour De Force Palette", "price": 1199.00, "stock": 300, "category": "makeup"},
            {"name": "SUGAR Ace Of Face Primer", "price": 799.00, "stock": 400, "category": "makeup"},
            {"name": "SUGAR Tipsy Lips Moisturizing Balm", "price": 299.00, "stock": 800, "category": "skincare"},
            {"name": "SUGAR Aquaholic Setting Mist", "price": 599.00, "stock": 500, "category": "skincare"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 8000}},
        ],
    },
    {
        "name": "FreshToHome Fish & Meat",
        "email": "ops@freshtohome-merchant.com",
        "kyc_status": "pending",
        "environment": "sandbox",
        "limits_config": {"max_order_amount": 3000, "daily_limit": 25000, "currency": "INR"},
        "catalog": [
            {"name": "Rohu Fish Steaks (500g)", "price": 259.00, "stock": 300, "category": "fish"},
            {"name": "Tilapia Fillet (500g)", "price": 299.00, "stock": 250, "category": "fish"},
            {"name": "Chicken Seekh Kebab (300g)", "price": 349.00, "stock": 200, "category": "ready_to_cook"},
            {"name": "Mutton Keema (400g)", "price": 449.00, "stock": 150, "category": "mutton"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 3000}},
        ],
    },
    {
        "name": "Classplus EdTech Platform",
        "email": "saas@classplus-merchant.com",
        "kyc_status": "verified",
        "environment": "live",
        "limits_config": {"max_order_amount": 30000, "daily_limit": 200000, "currency": "INR"},
        "catalog": [
            {"name": "Classplus Basic Plan (Monthly)", "price": 1499.00, "stock": 999, "category": "saas"},
            {"name": "Classplus Growth Plan (Monthly)", "price": 3499.00, "stock": 999, "category": "saas"},
            {"name": "Classplus Pro Plan (Yearly)", "price": 29999.00, "stock": 200, "category": "saas"},
            {"name": "Video Storage Add-on (100GB)", "price": 999.00, "stock": 999, "category": "saas"},
            {"name": "Live Class Feature Add-on", "price": 1999.00, "stock": 500, "category": "saas"},
        ],
        "policies": [
            {"rule_type": "max_amount_per_tx", "config": {"limit": 30000}},
        ],
    },
]

# ─── seed function ─────────────────────────────────────────────────────────────

def seed():
    db = SessionLocal()
    inserted = 0
    skipped = 0

    try:
        for m_data in MERCHANTS:
            # Skip if merchant already exists
            existing = db.query(Merchant).filter(Merchant.email == m_data["email"]).first()
            if existing:
                print(f"  [SKIP] {m_data['name']} (already exists)")
                skipped += 1
                continue

            # Create merchant
            merchant = Merchant(
                id=uuid.uuid4(),
                name=m_data["name"],
                email=m_data["email"],
                password_hash=hash_password("Demo@1234"),
                kyc_status=m_data["kyc_status"],
                environment=m_data["environment"],
                limits_config=m_data["limits_config"],
            )
            db.add(merchant)
            db.flush()  # get merchant.id before inserting children

            # Create catalog items
            for item in m_data["catalog"]:
                db.add(CatalogItem(
                    id=uuid.uuid4(),
                    merchant_id=merchant.id,
                    name=item["name"],
                    price=item["price"],
                    stock=item["stock"],
                    category=item["category"],
                ))

            # Create policies
            for pol in m_data["policies"]:
                db.add(Policy(
                    id=uuid.uuid4(),
                    merchant_id=merchant.id,
                    rule_type=pol["rule_type"],
                    config=pol["config"],
                ))

            # Create a sandbox agent for every merchant
            raw_key, hashed_key = make_api_key()
            db.add(Agent(
                id=uuid.uuid4(),
                merchant_id=merchant.id,
                name=f"{m_data['name']} Default Agent",
                api_key_hash=hashed_key,
                scopes=["read_catalog", "propose_order", "execute_payment"],
                environment="sandbox",
            ))

            print(f"  [OK]   {m_data['name']}")
            inserted += 1

        db.commit()
        print(f"\nSeeding complete -- {inserted} inserted, {skipped} skipped.")

    except Exception as e:
        db.rollback()
        print(f"\nSeeding FAILED: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting seed...\n")
    seed()
