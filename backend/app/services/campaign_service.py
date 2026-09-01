import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.campaign_offer import CampaignOffer
from app.models.audit import AuditEvent
from app.models.catalog import CatalogItem
from app.models.merchant import Merchant
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.schemas.campaign_offer import CampaignOfferItemResponse, MerchantCampaignPerformanceResponse
from app.services.audit_service import AuditService

class CampaignService:
    """
    Deterministic, rule-based Abandonment Re-Engagement Campaign Orchestrator.
    Scans audit_events for unconverted shopping interest and produces bounded discount offers.
    """

    @classmethod
    def scan_and_generate_abandonment_offers(
        cls,
        db: Session,
        days_stale: int = 7,
        force_generate_for_customer: Optional[str] = None
    ) -> List[CampaignOffer]:
        """
        Background / Scheduled scan:
        Detects stale unconverted search or order proposals (older than days_stale)
        and generates bounded personalized discount offers for consumers.
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_stale)
        now = datetime.now(timezone.utc)
        generated_offers: List[CampaignOffer] = []

        # Target audit event actions indicating product shopping interest
        interest_actions = [
            "propose_order",
            "search_and_compare",
            "agent_chat_search",
            "catalog_search",
            "customer_chat_search",
            "agent_action_executed",
            "execute_node_completed"
        ]

        # Query relevant audit events
        query = db.query(AuditEvent).filter(
            AuditEvent.action.in_(interest_actions),
            AuditEvent.created_at <= cutoff_date
        )

        events = query.order_by(AuditEvent.created_at.desc()).limit(100).all()

        for event in events:
            # 1. Resolve Customer ID
            customer_id = None
            if event.actor_type == "customer":
                try:
                    customer_id = uuid.UUID(str(event.actor_id))
                except Exception:
                    pass

            if not customer_id and event.input and isinstance(event.input, dict):
                c_val = event.input.get("customer_id")
                if c_val:
                    try:
                        customer_id = uuid.UUID(str(c_val))
                    except Exception:
                        pass

            if force_generate_for_customer and str(customer_id) != str(force_generate_for_customer):
                continue

            if not customer_id:
                continue

            # Verify customer exists
            cust = db.query(Customer).filter(Customer.id == customer_id).first()
            if not cust:
                continue

            # 2. Resolve Catalog Item & Merchant
            item: Optional[CatalogItem] = None
            if event.input and isinstance(event.input, dict):
                # Try by item_id
                it_id = event.input.get("item_id")
                if it_id:
                    try:
                        item = db.query(CatalogItem).filter(CatalogItem.id == uuid.UUID(str(it_id))).first()
                    except Exception:
                        pass

                # Try by item_name
                if not item:
                    it_name = event.input.get("item_name") or event.input.get("original_item") or event.input.get("query")
                    if it_name and isinstance(it_name, str):
                        item = db.query(CatalogItem).filter(CatalogItem.name.ilike(f"%{it_name.strip()}%")).first()

            if not item:
                # Fallback: check reasoning text for known catalog items
                for cat_it in db.query(CatalogItem).filter(CatalogItem.stock > 0).limit(5).all():
                    if cat_it.name.lower() in (event.reasoning or "").lower():
                        item = cat_it
                        break

            if not item or item.stock <= 0:
                continue

            merchant = db.query(Merchant).filter(Merchant.id == item.merchant_id).first()
            if not merchant:
                continue

            # 3. Check for Converted Settled Transaction
            # If customer already bought an item from this merchant or this specific item, skip!
            settled_tx = db.query(Transaction).filter(
                Transaction.merchant_id == item.merchant_id,
                Transaction.created_at >= event.created_at,
                func.lower(Transaction.status).in_(["settled", "payment_settled", "paid", "completed"])
            ).first()

            if settled_tx:
                # Customer already completed a purchase — no abandonment offer needed
                continue

            # 4. Check if an active offer already exists for this (customer, item)
            existing_offer = db.query(CampaignOffer).filter(
                CampaignOffer.customer_id == customer_id,
                CampaignOffer.source_item_id == item.id,
                CampaignOffer.status.in_(["pending", "shown", "converted"]),
                CampaignOffer.expires_at > now
            ).first()

            if existing_offer:
                continue

            # 5. Calculate Bounded Discount using Merchant Limits Config
            # Default bounds: 10% discount, max ₹500 discount, max ₹10,000 campaign budget
            limits_cfg = merchant.limits_config or {}
            max_discount_pct = float(limits_cfg.get("max_discount_pct", 15.0))
            max_discount_amount = float(limits_cfg.get("max_discount_amount", 500.00))
            total_campaign_budget = float(limits_cfg.get("total_campaign_budget", 10000.00))

            # Calculate total discount already granted across converted offers for this merchant
            converted_discounts = db.query(
                func.sum(CampaignOffer.original_price - CampaignOffer.discounted_price)
            ).filter(
                CampaignOffer.merchant_id == merchant.id,
                CampaignOffer.status == "converted"
            ).scalar() or Decimal("0.00")

            if float(converted_discounts) >= total_campaign_budget:
                # Merchant campaign budget exhausted
                continue

            # Compute bounded discount percentage and amount
            orig_price = float(item.price)
            proposed_pct = 10.0 # 10% re-engagement discount
            applied_pct = min(proposed_pct, max_discount_pct)
            raw_discount = orig_price * (applied_pct / 100.0)
            clamped_discount = min(raw_discount, max_discount_amount)
            discounted_price = round(max(1.0, orig_price - clamped_discount), 2)

            reason = (
                f"Exclusive {applied_pct:.0f}% re-engagement discount (Save ₹{clamped_discount:,.2f}) on '{item.name}' "
                f"which you explored previously. Valid for 72 hours."
            )

            offer = CampaignOffer(
                id=uuid.uuid4(),
                customer_id=customer_id,
                merchant_id=merchant.id,
                source_item_id=item.id,
                source_event_id=event.id,
                discount_type="percentage",
                discount_value=Decimal(str(applied_pct)),
                original_price=Decimal(str(orig_price)),
                discounted_price=Decimal(str(discounted_price)),
                reason=reason,
                status="pending",
                expires_at=now + timedelta(days=3)
            )

            db.add(offer)
            db.commit()
            db.refresh(offer)
            generated_offers.append(offer)

            # Log audit event for offer generation
            AuditService.log_event(
                db=db,
                actor_type="system",
                actor_id=str(merchant.id),
                action="campaign_offer_generated",
                input={
                    "offer_id": str(offer.id),
                    "customer_id": str(customer_id),
                    "item_id": str(item.id),
                    "original_price": str(orig_price),
                    "discounted_price": str(discounted_price),
                    "discount_value": str(applied_pct)
                },
                decision="OFFER_GENERATED",
                reasoning=f"Generated bounded {applied_pct:.0f}% abandonment discount offer for customer on '{item.name}'.",
                merchant_id=merchant.id
            )

        return generated_offers

    @classmethod
    def get_pending_offers_for_customer(
        cls,
        db: Session,
        customer_id: uuid.UUID
    ) -> List[CampaignOfferItemResponse]:
        """
        Retrieves active, unexpired campaign offers for a customer to display in chat.
        Marks pending offers as 'shown' and logs an audit event.
        """
        now = datetime.now(timezone.utc)
        offers = db.query(CampaignOffer).filter(
            CampaignOffer.customer_id == customer_id,
            CampaignOffer.status.in_(["pending", "shown"]),
            CampaignOffer.expires_at > now
        ).order_by(CampaignOffer.created_at.desc()).all()

        results: List[CampaignOfferItemResponse] = []

        for off in offers:
            if off.status == "pending":
                off.status = "shown"
                db.commit()

                # Audit log for offer impression
                AuditService.log_event(
                    db=db,
                    actor_type="customer",
                    actor_id=str(customer_id),
                    action="campaign_offer_shown",
                    input={
                        "offer_id": str(off.id),
                        "item_id": str(off.source_item_id),
                        "discounted_price": str(off.discounted_price)
                    },
                    decision="SHOWN_TO_CUSTOMER",
                    reasoning=f"Campaign discount offer for '{off.source_item.name if off.source_item else 'Item'}' delivered in consumer chat.",
                    merchant_id=off.merchant_id
                )

            m_name = off.merchant.name if off.merchant else "Merchant Partner"
            it_name = off.source_item.name if off.source_item else "Special Item"
            it_cat = off.source_item.category if off.source_item else "General"

            results.append(CampaignOfferItemResponse(
                id=str(off.id),
                customer_id=str(off.customer_id),
                merchant_id=str(off.merchant_id),
                merchant_name=m_name,
                source_item_id=str(off.source_item_id),
                item_name=it_name,
                category=it_cat,
                discount_type=off.discount_type,
                discount_value=float(off.discount_value),
                original_price=float(off.original_price),
                discounted_price=float(off.discounted_price),
                reason=off.reason,
                status=off.status,
                created_at=off.created_at.isoformat() if off.created_at else now.isoformat(),
                expires_at=off.expires_at.isoformat() if off.expires_at else (now + timedelta(days=3)).isoformat()
            ))

        return results

    @classmethod
    def mark_offer_converted(
        cls,
        db: Session,
        offer_id: uuid.UUID,
        transaction_id: uuid.UUID
    ) -> Optional[CampaignOffer]:
        """
        Marks an offer converted upon settlement and links to transaction.
        """
        offer = db.query(CampaignOffer).filter(CampaignOffer.id == offer_id).first()
        if not offer:
            return None

        offer.status = "converted"
        db.commit()
        db.refresh(offer)

        # Log audit event
        AuditService.log_event(
            db=db,
            actor_type="customer",
            actor_id=str(offer.customer_id),
            action="campaign_offer_converted",
            input={
                "offer_id": str(offer.id),
                "transaction_id": str(transaction_id),
                "saved_amount": str(offer.original_price - offer.discounted_price)
            },
            decision="CONVERTED",
            reasoning=f"Customer redeemed abandonment campaign offer and settled transaction {transaction_id}.",
            merchant_id=offer.merchant_id
        )

        return offer

    @classmethod
    def get_merchant_campaign_performance(
        cls,
        db: Session,
        merchant_id: uuid.UUID
    ) -> MerchantCampaignPerformanceResponse:
        """
        Calculates exact real metrics for a merchant's abandonment re-engagement campaigns.
        """
        m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        m_name = m.name if m else "Merchant"

        offers = db.query(CampaignOffer).filter(
            CampaignOffer.merchant_id == merchant_id
        ).order_by(CampaignOffer.created_at.desc()).all()

        offers_generated = len(offers)
        offers_shown = sum(1 for o in offers if o.status in ["shown", "converted"])
        offers_converted = sum(1 for o in offers if o.status == "converted")
        conversion_rate = (float(offers_converted) / float(offers_shown) * 100.0) if offers_shown > 0 else 0.0

        total_discount = Decimal("0.00")
        total_attributed_gmv = Decimal("0.00")

        # Sum total discount given on converted offers
        for o in offers:
            if o.status == "converted":
                diff = (o.original_price or Decimal("0.00")) - (o.discounted_price or Decimal("0.00"))
                total_discount += max(Decimal("0.00"), diff)

        # Sum real settled transaction revenue carrying source_campaign_offer_id
        attributed_txs = db.query(Transaction).filter(
            Transaction.merchant_id == merchant_id,
            Transaction.source_campaign_offer_id.isnot(None),
            func.lower(Transaction.status).in_(["settled", "payment_settled", "paid", "completed"])
        ).all()

        for tx in attributed_txs:
            total_attributed_gmv += (tx.amount or Decimal("0.00"))

        offer_items: List[CampaignOfferItemResponse] = []
        for off in offers:
            it_name = off.source_item.name if off.source_item else "Item"
            it_cat = off.source_item.category if off.source_item else "General"
            offer_items.append(CampaignOfferItemResponse(
                id=str(off.id),
                customer_id=str(off.customer_id),
                merchant_id=str(off.merchant_id),
                merchant_name=m_name,
                source_item_id=str(off.source_item_id),
                item_name=it_name,
                category=it_cat,
                discount_type=off.discount_type,
                discount_value=float(off.discount_value),
                original_price=float(off.original_price),
                discounted_price=float(off.discounted_price),
                reason=off.reason,
                status=off.status,
                created_at=off.created_at.isoformat() if off.created_at else "",
                expires_at=off.expires_at.isoformat() if off.expires_at else ""
            ))

        return MerchantCampaignPerformanceResponse(
            merchant_id=str(merchant_id),
            merchant_name=m_name,
            offers_generated=offers_generated,
            offers_shown=offers_shown,
            offers_converted=offers_converted,
            conversion_rate=round(conversion_rate, 2),
            total_discount_given=float(total_discount),
            total_attributed_revenue=float(total_attributed_gmv),
            offers=offer_items
        )
