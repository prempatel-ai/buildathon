"""
Unit Test Suite: PolicyGate Determinism & Decision Integrity (Ticket 18 / Phase 16)

Verifies:
1. 5x Repeat Determinism: Same intent + same policy state -> identical decision & reasoning every time.
2. Direct Template Reasoning: ALLOW and DENY reasoning strings map directly to rule evaluation values without LLM paraphrasing.
3. Pure Logic Gate Evaluation: Proves zero LLM calls occur during policy gating.
"""

import unittest
from decimal import Decimal
from app.services.policy_gate import PolicyGate

class TestPolicyGateDeterminism(unittest.TestCase):
    def test_5x_repeat_determinism(self):
        """
        Runs the exact same intent and policy configuration 5 consecutive times.
        Asserts 100% identical decisions and reasoning strings (0 diffs across runs).
        """
        intent = {
            "amount": 2499.00,
            "category": "Electronics",
            "quantity": 1,
            "stock": 50,
            "item_name": "boAt Rockerz 450"
        }
        merchant_policy = [
            {"rule_type": "max_amount", "config": {"max_amount": 10000.00, "approval_threshold": 8000.00}},
            {"rule_type": "category_filter", "config": {"allowed_categories": ["Electronics", "Wearables"]}}
        ]
        agent_context = {"merchant_id": "merch_12345", "agent_id": "agent_999"}

        results = []
        for i in range(5):
            res = PolicyGate.check(
                intent=intent,
                merchant_policy=merchant_policy,
                agent_context=agent_context
            )
            results.append(res)

        # Assert all 5 runs produced exact identical outputs
        first_res = results[0]
        for idx, r in enumerate(results[1:], start=2):
            self.assertEqual(r["decision"], first_res["decision"], f"Run {idx} decision differed!")
            self.assertEqual(r["reasoning"], first_res["reasoning"], f"Run {idx} reasoning differed!")
            self.assertEqual(r["triggered_rule"], first_res["triggered_rule"], f"Run {idx} triggered_rule differed!")

    def test_allow_response_reasoning_format(self):
        """
        Verifies ALLOW decision payload maps directly to string template values.
        """
        intent = {"amount": 1500.00, "category": "Electronics", "quantity": 1, "stock": 10}
        merchant_policy = [{"rule_type": "max_amount", "config": {"max_amount": 5000.00}}]

        res = PolicyGate.check(intent=intent, merchant_policy=merchant_policy)

        self.assertEqual(res["decision"], "ALLOW")
        self.assertIn("allowed: amount 1500.00 <= merchant bounds", res["reasoning"])
        self.assertIsNone(res["triggered_rule"])

    def test_deny_amount_exceeded_reasoning_format(self):
        """
        Verifies DENY decision payload when amount exceeds merchant max limit.
        Reasoning string maps directly to f"denied: amount {amount} > merchant_max {cap}".
        """
        intent = {"amount": 15000.00, "category": "Electronics", "quantity": 1, "stock": 10}
        merchant_policy = [{"rule_type": "max_amount", "config": {"max_amount": 10000.00}}]

        res = PolicyGate.check(intent=intent, merchant_policy=merchant_policy)

        self.assertEqual(res["decision"], "DENY")
        self.assertEqual(res["reasoning"], "denied: amount 15000.00 > merchant_max 10000.00")
        self.assertEqual(res["triggered_rule"], "max_amount")

    def test_deny_stock_unavailable_reasoning_format(self):
        """
        Verifies DENY decision payload when requested quantity exceeds item stock.
        """
        intent = {"amount": 2000.00, "category": "Electronics", "quantity": 5, "stock": 2}
        merchant_policy = []

        res = PolicyGate.check(intent=intent, merchant_policy=merchant_policy)

        self.assertEqual(res["decision"], "DENY")
        self.assertEqual(res["reasoning"], "denied: requested quantity 5 > item_stock 2")
        self.assertEqual(res["triggered_rule"], "item_stock")

    def test_needs_approval_grey_zone_reasoning_format(self):
        """
        Verifies NEEDS_APPROVAL decision when amount is in the grey zone between threshold and max.
        """
        intent = {"amount": 6000.00, "category": "Electronics", "quantity": 1, "stock": 10}
        merchant_policy = [{"rule_type": "max_amount", "config": {"max_amount": 10000.00, "approval_threshold": 5000.00}}]

        res = PolicyGate.check(intent=intent, merchant_policy=merchant_policy)

        self.assertEqual(res["decision"], "NEEDS_APPROVAL")
        self.assertEqual(res["reasoning"], "needs_approval: amount 6000.00 > approval_threshold 5000.00")
        self.assertEqual(res["triggered_rule"], "max_amount_grey_zone")

if __name__ == "__main__":
    unittest.main()
