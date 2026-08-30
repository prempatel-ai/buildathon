"""
PolicyGate — Pure Deterministic Policy & Gate 2 Evaluation Engine

Core Principle: "LLM proposes, engine disposes."
Zero LLM calls occur during or after rule evaluation.
All ALLOW, DENY, and NEEDS_APPROVAL decisions are 100% reproducible,
deterministic, and explainable via pure string templating.
"""

from typing import Dict, Any, Optional, List
from decimal import Decimal

class PolicyGate:
    @staticmethod
    def check(
        intent: Dict[str, Any],
        merchant_policy: Optional[List[Dict[str, Any]]] = None,
        agent_context: Optional[Dict[str, Any]] = None,
        redis_client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Pure deterministic function evaluating Gate 2 rules.
        
        Args:
            intent: Dict containing {"amount": float/Decimal, "category": str, "quantity": int, "item_name": str, "stock": int}
            merchant_policy: List of policy rule dicts, e.g. [{"rule_type": "max_amount", "config": {...}}]
            agent_context: Dict containing {"merchant_id": str, "agent_id": str}
            redis_client: Optional Redis client instance for velocity rate limiting
            
        Returns:
            Dict: {"decision": "ALLOW" | "DENY" | "NEEDS_APPROVAL", "reasoning": str, "triggered_rule": Optional[str]}
        """
        merchant_policy = merchant_policy or []
        agent_context = agent_context or {}
        
        amount = Decimal(str(intent.get("amount", "0")))
        category = str(intent.get("category", "General")).strip()
        quantity = int(intent.get("quantity", 1))
        stock = intent.get("stock")
        
        # 1. Stock Availability Rule Check
        if stock is not None:
            stock_int = int(stock)
            if stock_int < quantity:
                return {
                    "decision": "DENY",
                    "reasoning": f"denied: requested quantity {quantity} > item_stock {stock_int}",
                    "triggered_rule": "item_stock"
                }

        # 2. Whitelisted / Blocked Category Rule Check
        for p in merchant_policy:
            if p.get("rule_type") == "category_filter":
                config = p.get("config", {})
                allowed = config.get("allowed_categories", [])
                blocked = config.get("blocked_categories", [])

                if blocked and category in blocked:
                    return {
                        "decision": "DENY",
                        "reasoning": f"denied: product category '{category}' is explicitly blocked by merchant policy",
                        "triggered_rule": "category_filter"
                    }

                if allowed and category not in allowed:
                    allowed_str = ", ".join(allowed)
                    return {
                        "decision": "DENY",
                        "reasoning": f"denied: product category '{category}' is not in merchant allowed categories [{allowed_str}]",
                        "triggered_rule": "category_filter"
                    }

        # 3. Spend Limit & Grey Zone Approval Threshold Rule Check
        for p in merchant_policy:
            if p.get("rule_type") == "max_amount":
                config = p.get("config", {})
                max_amt = Decimal(str(config.get("max_amount", "0")))
                appr_thresh = config.get("approval_threshold")
                appr_thresh_dec = Decimal(str(appr_thresh)) if appr_thresh is not None else None

                # Hard Limit Deny
                if max_amt > 0 and amount > max_amt:
                    return {
                        "decision": "DENY",
                        "reasoning": f"denied: amount {amount:.2f} > merchant_max {max_amt:.2f}",
                        "triggered_rule": "max_amount"
                    }

                # Human Approval Threshold
                if appr_thresh_dec is not None and amount > appr_thresh_dec:
                    return {
                        "decision": "NEEDS_APPROVAL",
                        "reasoning": f"needs_approval: amount {amount:.2f} > approval_threshold {appr_thresh_dec:.2f}",
                        "triggered_rule": "max_amount_grey_zone"
                    }

        # 4. Redis Velocity Rate Limiter Check
        for p in merchant_policy:
            if p.get("rule_type") == "velocity_limit":
                config = p.get("config", {})
                max_count = int(config.get("max_count", 0))
                window_seconds = int(config.get("window_seconds", 3600))
                merchant_id = agent_context.get("merchant_id", "default_merchant")
                agent_id = agent_context.get("agent_id", "default_agent")

                if max_count > 0 and redis_client:
                    try:
                        from app.policy.velocity import check_velocity_limit
                        is_allowed, count = check_velocity_limit(
                            redis_client=redis_client,
                            merchant_id=merchant_id,
                            agent_id=agent_id,
                            max_count=max_count,
                            window_seconds=window_seconds
                        )
                        if not is_allowed:
                            return {
                                "decision": "DENY",
                                "reasoning": f"denied: velocity count {count} > limit {max_count} within {window_seconds}s window",
                                "triggered_rule": "velocity_limit"
                            }
                    except Exception:
                        pass

        # 5. Default ALLOW (All deterministic rules passed cleanly)
        return {
            "decision": "ALLOW",
            "reasoning": f"allowed: amount {amount:.2f} <= merchant bounds and all rules passed",
            "triggered_rule": None
        }
