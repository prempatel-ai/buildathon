from typing import List, Dict, Any, Optional, Union
from decimal import Decimal
import redis
from app.schemas.policy import ProposedAction, PolicyDecision, DecisionEnum
from app.policy.velocity import check_velocity_limit

def evaluate(
    action: ProposedAction,
    policies: List[Union[Dict[str, Any], Any]],
    redis_client: Optional[redis.Redis] = None
) -> PolicyDecision:
    """
    Pure policy evaluation engine.
    Given a ProposedAction, list of merchant policies, and an optional Redis client,
    evaluates rules in deterministic sequence and returns a PolicyDecision.
    """

    # Extract policy configurations from list of dictionaries or DB model objects
    formatted_policies = []
    for p in policies:
        if isinstance(p, dict):
            rule_type = p.get("rule_type")
            config = p.get("config", {})
        else:
            rule_type = getattr(p, "rule_type", None)
            config = getattr(p, "config", {})
        if rule_type:
            formatted_policies.append({"rule_type": rule_type, "config": config})

    # Rule 1: Category Filter (Allowlist / Blocklist)
    for p in formatted_policies:
        if p["rule_type"] == "category_filter":
            config = p["config"]
            allowed = config.get("allowed_categories", [])
            blocked = config.get("blocked_categories", [])

            if blocked and action.category in blocked:
                return PolicyDecision(
                    decision=DecisionEnum.DENY,
                    reasoning=f"Denied: Product category '{action.category}' is explicitly blocked by merchant policy.",
                    triggered_rule="category_filter"
                )

            if allowed and action.category not in allowed:
                allowed_str = ", ".join(allowed)
                return PolicyDecision(
                    decision=DecisionEnum.DENY,
                    reasoning=f"Denied: Product category '{action.category}' is not in the merchant's allowed categories list [{allowed_str}].",
                    triggered_rule="category_filter"
                )

    # Rule 2: Spend Limit & Human Approval Grey Zone
    for p in formatted_policies:
        if p["rule_type"] == "max_amount":
            config = p["config"]
            max_amt = Decimal(str(config.get("max_amount", "0")))
            appr_thresh = config.get("approval_threshold")
            appr_thresh_dec = Decimal(str(appr_thresh)) if appr_thresh is not None else None

            # Hard Max Deny
            if max_amt > 0 and action.amount > max_amt:
                return PolicyDecision(
                    decision=DecisionEnum.DENY,
                    reasoning=f"Denied: Requested amount ₹{action.amount:,.2f} exceeds merchant maximum single transaction limit of ₹{max_amt:,.2f}.",
                    triggered_rule="max_amount"
                )

            # Grey Zone Needs Approval
            if appr_thresh_dec is not None and action.amount > appr_thresh_dec:
                return PolicyDecision(
                    decision=DecisionEnum.NEEDS_APPROVAL,
                    reasoning=f"Approval Required: Requested amount ₹{action.amount:,.2f} exceeds auto-approval threshold of ₹{appr_thresh_dec:,.2f} and requires human confirmation.",
                    triggered_rule="max_amount_grey_zone"
                )

    # Rule 3: Velocity Limit (Redis Sliding Window)
    for p in formatted_policies:
        if p["rule_type"] == "velocity_limit":
            config = p["config"]
            max_count = int(config.get("max_count", 0))
            window_seconds = int(config.get("window_seconds", 3600))

            if max_count > 0:
                is_allowed, count = check_velocity_limit(
                    redis_client=redis_client,
                    merchant_id=str(action.merchant_id),
                    agent_id=str(action.agent_id),
                    max_count=max_count,
                    window_seconds=window_seconds
                )
                if not is_allowed:
                    return PolicyDecision(
                        decision=DecisionEnum.DENY,
                        reasoning=f"Denied: Velocity limit exceeded. Agent has made {count} transactions within the {window_seconds}s window (limit: {max_count}).",
                        triggered_rule="velocity_limit"
                    )

    # Default: All policy checks passed cleanly
    return PolicyDecision(
        decision=DecisionEnum.ALLOW,
        reasoning=f"Action approved: Proposed purchase of '{action.category}' for ₹{action.amount:,.2f} passed all merchant policy checks.",
        triggered_rule=None
    )
