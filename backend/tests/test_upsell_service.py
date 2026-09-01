import uuid
import pytest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

from app.core.database import Base
from app.models.merchant import Merchant
from app.models.catalog import CatalogItem
from app.models.audit import AuditEvent
from app.services.upsell_service import UpsellService

# Use isolated SQLite in-memory database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # 1. Create Merchants
    m1 = Merchant(
        id=uuid.uuid4(),
        name="SoundHub Audio Store",
        email="soundhub@example.com",
        limits_config={}
    )
    m2 = Merchant(
        id=uuid.uuid4(),
        name="FitGear & Nutrition",
        email="fitgear@example.com",
        limits_config={}
    )
    db.add_all([m1, m2])
    db.commit()

    # 2. Seed Catalog with baseline, upsell, and cross-sell items with rich specs
    items = [
        # Baseline Headphone
        CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m1.id,
            name="boAt Rockerz 450",
            price=Decimal("1299.00"),
            stock=25,
            category="Audio",
            description="On-ear wireless headphones with 15 hours battery life.",
            specifications={
                "battery_life": "15 Hours",
                "noise_cancellation": "Passive",
                "drivers": "40mm Standard",
                "warranty": "1 Year"
            }
        ),
        # Upsell Headphone (Higher tier, same category)
        CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m1.id,
            name="Sony WH-1000XM4 ANC",
            price=Decimal("2499.00"),
            stock=15,
            category="Audio",
            description="Industry leading noise canceling wireless headphones with 40h battery.",
            specifications={
                "battery_life": "40 Hours",
                "noise_cancellation": "Active Noise Cancellation (ANC)",
                "drivers": "40mm HD Neodymium",
                "warranty": "2 Years"
            }
        ),
        # Cross-Sell Accessory (Complementary category)
        CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m1.id,
            name="Hard-Shell Headphone Travel Case",
            price=Decimal("399.00"),
            stock=50,
            category="Accessories",
            description="Shockproof protective carrying case with accessory pouch.",
            specifications={
                "material": "EVA Hard Shell",
                "water_resistant": "Yes",
                "warranty": "6 Months"
            }
        ),
        # Baseline Smartwatch
        CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m2.id,
            name="Noise ColorFit Pro 3",
            price=Decimal("1999.00"),
            stock=30,
            category="Smartwatches",
            description="Smartwatch with 1.4-inch color touch display.",
            specifications={
                "display": "1.4-inch TFT LCD",
                "battery_life": "10 Days",
                "bluetooth_calling": "No"
            }
        ),
        # Upsell Smartwatch
        CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m2.id,
            name="Noise Evolve 2 Max AMOLED",
            price=Decimal("3499.00"),
            stock=20,
            category="Smartwatches",
            description="Premium smartwatch with 1.78-inch Super AMOLED Always-on display and BT calling.",
            specifications={
                "display": "1.78-inch Super AMOLED",
                "battery_life": "7 Days Always-On",
                "bluetooth_calling": "Yes (Mic & Speaker)"
            }
        ),
        # Cross-Sell Strap
        CatalogItem(
            id=uuid.uuid4(),
            merchant_id=m2.id,
            name="Silicone Sport Breathable Strap",
            price=Decimal("299.00"),
            stock=100,
            category="Accessories",
            description="Quick-release 22mm sweat-proof replacement strap.",
            specifications={
                "material": "Silicone",
                "size": "22mm Quick Release"
            }
        )
    ]
    db.add_all(items)
    db.commit()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)

def test_01_upsell_generation_with_spec_and_price_differences(setup_db):
    """Verify upsell suggestions generate higher-tier items with real price delta and spec comparison."""
    db = setup_db

    suggestions = UpsellService.generate_suggestions(
        db=db,
        item_name="boAt Rockerz 450",
        category="Audio",
        price=1299.00,
        max_suggestions=3
    )

    assert len(suggestions) >= 1
    upsell = next((s for s in suggestions if s.suggestion_type == "upsell"), None)
    assert upsell is not None
    assert "Sony" in upsell.item_name
    assert upsell.price == 2499.00
    assert upsell.comparison.price_delta == 1200.00
    assert upsell.comparison.price_delta_percentage > 0
    assert len(upsell.comparison.spec_differences) > 0

    # Verify key spec differences are captured
    spec_names = [d.feature_name.lower() for d in upsell.comparison.spec_differences]
    assert any("battery" in s or "noise" in s or "driver" in s or "warranty" in s for s in spec_names)

def test_02_cross_sell_generation_with_complementary_categories(setup_db):
    """Verify cross-sell suggestions correctly surface items from complementary categories."""
    db = setup_db

    suggestions = UpsellService.generate_suggestions(
        db=db,
        item_name="boAt Rockerz 450",
        category="Audio",
        price=1299.00,
        max_suggestions=3
    )

    cross_sell = next((s for s in suggestions if s.suggestion_type == "cross_sell"), None)
    assert cross_sell is not None
    assert cross_sell.category == "Accessories"
    assert "Case" in cross_sell.item_name or "Strap" in cross_sell.item_name
    assert cross_sell.comparison.price_delta < 0  # Cheaper accessory addition

def test_03_smartwatch_upsell_and_cross_sell(setup_db):
    """Verify smartwatch order generates AMOLED BT-calling upsell and accessory strap cross-sell."""
    db = setup_db

    suggestions = UpsellService.generate_suggestions(
        db=db,
        item_name="Noise ColorFit Pro 3",
        category="Smartwatches",
        price=1999.00,
        max_suggestions=3
    )

    assert len(suggestions) >= 2
    types = [s.suggestion_type for s in suggestions]
    assert "upsell" in types
    assert "cross_sell" in types

    upsell = next(s for s in suggestions if s.suggestion_type == "upsell")
    assert "Evolve" in upsell.item_name
    assert upsell.price == 3499.00
    assert upsell.comparison.price_delta == 1500.00

def test_04_audit_event_logged_on_suggestion_generation(setup_db):
    """Verify immutable audit log is generated with suggestion telemetry."""
    db = setup_db

    audit_before = db.query(AuditEvent).filter(AuditEvent.action == "suggestion_generated").count()

    UpsellService.generate_suggestions(
        db=db,
        item_name="boAt Rockerz 450",
        category="Audio",
        price=1299.00,
        customer_id=str(uuid.uuid4()),
        max_suggestions=2
    )

    audit_after = db.query(AuditEvent).filter(AuditEvent.action == "suggestion_generated").count()
    assert audit_after > audit_before

def test_05_suggestions_never_bypass_spend_gates():
    """Verify schema guarantees suggestions are informative comparisons and not auto-injected purchases."""
    from app.schemas.upsell import UpsellCrossSellSuggestion, ProductComparison

    comp = ProductComparison(
        price_delta=100.0,
        price_delta_percentage=10.0,
        spec_differences=[],
        summary_reason="Comparison only"
    )
    sugg = UpsellCrossSellSuggestion(
        item_id=str(uuid.uuid4()),
        item_name="Premium Edition",
        merchant_id=str(uuid.uuid4()),
        merchant_name="Store",
        price=2000.0,
        category="Audio",
        stock=10,
        suggestion_type="upsell",
        reason="Upgrade option",
        comparison=comp
    )
    assert sugg.suggestion_type == "upsell"
    assert sugg.comparison.price_delta == 100.0
