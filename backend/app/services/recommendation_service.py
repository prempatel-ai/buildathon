import uuid
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.recommendation import Recommendation
from app.models.catalog import CatalogItem
from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.models.spend_authorization import SpendAuthorization
from app.services.audit_service import AuditService
from app.schemas.recommendation import (
    RecommendationItemResponse,
    AttributedTransactionItem,
    MerchantRevenueAttributionResponse
)

class RecommendationService:
    COMPLEMENTARY_MAP = {
        "audio": ["wearables", "smartwatches", "accessories", "electronics"],
        "headphones": ["wearables", "smartwatches", "accessories", "electronics"],
        "earbuds": ["wearables", "smartwatches", "accessories", "electronics"],
        "smartwatches": ["audio", "headphones", "fitness", "health", "accessories"],
        "wearables": ["audio", "headphones", "fitness", "health", "accessories"],
        "grocery": ["dairy", "breakfast", "healthy snacks", "beverages"],
        "dairy": ["grocery", "breakfast", "healthy snacks", "beverages"],
        "fitness": ["wearables", "audio", "supplements", "beverages"],
        "fashion": ["accessories", "footwear", "bags"],
        "apparel": ["accessories", "footwear", "bags"]
    }

    @classmethod
    def generate_post_purchase_recommendations(
        cls,
        db: Session,
        customer_id: uuid.UUID,
        transaction_id: uuid.UUID,
        purchased_item_name: str,
        purchased_category: str,
        purchased_amount: float,
        purchased_merchant_id: uuid.UUID,
        limit: int = 3
    ) -> List[Recommendation]:
        """
        Generates 2-4 explainable rule-based post-purchase recommendations.
        Never executes orders - only surfaces relevant discovery candidates with explainable rationale.
        """
        category_clean = (purchased_category or "general").lower().strip()
        comp_categories = cls.COMPLEMENTARY_MAP.get(category_clean, ["electronics", "accessories", "audio", "wearables"])

        # Check customer remaining spend limit to prioritize budget-friendly recommendations
        remaining_balance = None
        auth = db.query(SpendAuthorization).filter(
            SpendAuthorization.customer_id == customer_id,
            SpendAuthorization.status == "active"
        ).first()
        if auth:
            remaining_balance = float(auth.remaining_limit)

        candidates: List[Dict[str, Any]] = []
        seen_item_ids = set()

        # Rule A: Complementary category heuristics
        comp_items = db.query(CatalogItem).filter(
            CatalogItem.stock > 0,
            func.lower(CatalogItem.name) != purchased_item_name.lower()
        ).all()

        for item in comp_items:
            it_cat = (item.category or "").lower().strip()
            if it_cat in comp_categories and item.id not in seen_item_ids:
                m = db.query(Merchant).filter(Merchant.id == item.merchant_id).first()
                m_name = m.name if m else "Verified Store"
                reason_str = f"Frequently paired with {purchased_category} purchases"
                candidates.append({
                    "item": item,
                    "merchant_name": m_name,
                    "reason": reason_str,
                    "priority": 1
                })
                seen_item_ids.add(item.id)

        # Rule B: Same category alternatives / value picks
        same_cat_items = db.query(CatalogItem).filter(
            CatalogItem.stock > 0,
            func.lower(CatalogItem.category) == category_clean,
            func.lower(CatalogItem.name) != purchased_item_name.lower()
        ).all()

        for item in same_cat_items:
            if item.id not in seen_item_ids:
                m = db.query(Merchant).filter(Merchant.id == item.merchant_id).first()
                m_name = m.name if m else "Verified Store"
                if float(item.price) < purchased_amount:
                    reason_str = f"Great value alternative in {purchased_category} (₹{float(item.price):,.2f})"
                else:
                    reason_str = f"Top-rated alternative in {purchased_category}"
                candidates.append({
                    "item": item,
                    "merchant_name": m_name,
                    "reason": reason_str,
                    "priority": 2
                })
                seen_item_ids.add(item.id)

        # Rule C: Cross-merchant verified discovery fallback
        all_items = db.query(CatalogItem).filter(
            CatalogItem.stock > 0,
            func.lower(CatalogItem.name) != purchased_item_name.lower()
        ).all()

        for item in all_items:
            if item.id not in seen_item_ids:
                m = db.query(Merchant).filter(Merchant.id == item.merchant_id).first()
                m_name = m.name if m else "Verified Store"
                reason_str = "Trending selection across verified partner merchants"
                candidates.append({
                    "item": item,
                    "merchant_name": m_name,
                    "reason": reason_str,
                    "priority": 3
                })
                seen_item_ids.add(item.id)

        # Sort candidates by priority and budget affinity
        def candidate_sort_key(c):
            price = float(c["item"].price)
            within_budget = 0 if (remaining_balance is None or price <= remaining_balance) else 1
            return (c["priority"], within_budget, price)

        candidates.sort(key=candidate_sort_key)
        selected_candidates = candidates[:max(2, min(4, limit))]

        created_recs: List[Recommendation] = []
        try:
            for c in selected_candidates:
                it = c["item"]
                rec = Recommendation(
                    customer_id=customer_id,
                    source_transaction_id=transaction_id,
                    recommended_item_id=it.id,
                    recommended_merchant_id=it.merchant_id,
                    reason=c["reason"],
                    status="shown"
                )
                db.add(rec)
                created_recs.append(rec)

            db.commit()
            for rec in created_recs:
                db.refresh(rec)

            # Log audit event for recommendation generation
            AuditService.log_event(
                db=db,
                actor_type="system",
                actor_id="recommendation_engine",
                action="recommendation_generated",
                input={
                    "source_transaction_id": str(transaction_id),
                    "customer_id": str(customer_id),
                    "purchased_item": purchased_item_name,
                    "purchased_category": purchased_category,
                    "count": len(created_recs),
                    "recommendation_ids": [str(r.id) for r in created_recs]
                },
                decision="GENERATED",
                reasoning=f"Generated {len(created_recs)} explainable post-purchase recommendations for transaction {transaction_id}.",
                merchant_id=purchased_merchant_id
            )
        except Exception as e:
            db.rollback()
            print(f"[REC_GENERATION_EXCEPTION]: {e}")

        return created_recs

    @classmethod
    def mark_recommendation_converted(
        cls,
        db: Session,
        recommendation_id: uuid.UUID,
        new_transaction_id: uuid.UUID
    ) -> Optional[Recommendation]:
        """
        Marks an existing recommendation as converted and logs cryptographic audit event.
        """
        rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
        if not rec:
            return None

        rec.status = "converted"
        db.commit()
        db.refresh(rec)

        AuditService.log_event(
            db=db,
            actor_type="customer",
            actor_id=str(rec.customer_id),
            action="recommendation_converted",
            input={
                "recommendation_id": str(recommendation_id),
                "source_transaction_id": str(rec.source_transaction_id),
                "converted_transaction_id": str(new_transaction_id),
                "recommended_item_id": str(rec.recommended_item_id),
                "recommended_merchant_id": str(rec.recommended_merchant_id)
            },
            decision="CONVERTED",
            reasoning=f"Recommendation {recommendation_id} successfully converted into settled transaction {new_transaction_id}.",
            merchant_id=rec.recommended_merchant_id
        )

        return rec

    @classmethod
    def get_merchant_revenue_attribution(
        cls,
        db: Session,
        merchant_id: uuid.UUID
    ) -> MerchantRevenueAttributionResponse:
        """
        Calculates exact revenue attributed to recommendations for a specific merchant.
        A purchase ONLY counts if source_recommendation_id is explicitly set on a settled transaction.
        """
        m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        merchant_name = m.name if m else "Merchant"

        # Query all settled transactions with explicit source_recommendation_id for this merchant
        attributed_txs = db.query(Transaction).filter(
            Transaction.merchant_id == merchant_id,
            Transaction.source_recommendation_id.isnot(None),
            Transaction.status.in_(["true", "SETTLED", "settled", "PAYMENT_SETTLED", "COMPLETED", "success"])
        ).order_by(Transaction.created_at.desc()).all()

        total_revenue = Decimal("0.00")
        tx_items: List[AttributedTransactionItem] = []

        for tx in attributed_txs:
            amt = tx.amount or Decimal("0.00")
            total_revenue += amt

            item_name = None
            if tx.error_details and isinstance(tx.error_details, dict):
                item_name = tx.error_details.get("item_name")

            tx_items.append(AttributedTransactionItem(
                transaction_id=str(tx.id),
                recommendation_id=str(tx.source_recommendation_id),
                amount=float(amt),
                item_name=item_name,
                status=tx.status,
                created_at=tx.created_at.isoformat() if tx.created_at else ""
            ))

        # Count total shown recommendations where recommended_merchant_id == merchant_id
        shown_count = db.query(Recommendation).filter(
            Recommendation.recommended_merchant_id == merchant_id
        ).count()

        # Count converted recommendations
        converted_count = db.query(Recommendation).filter(
            Recommendation.recommended_merchant_id == merchant_id,
            Recommendation.status == "converted"
        ).count()

        conversion_rate = (float(converted_count) / float(shown_count) * 100.0) if shown_count > 0 else 0.0

        return MerchantRevenueAttributionResponse(
            merchant_id=str(merchant_id),
            merchant_name=merchant_name,
            total_attributed_revenue=float(total_revenue),
            converted_recommendations_count=converted_count,
            shown_recommendations_count=shown_count,
            conversion_rate=round(conversion_rate, 2),
            attributed_transactions=tx_items
        )
