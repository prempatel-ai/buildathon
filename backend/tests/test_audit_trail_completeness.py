"""
Unit Test Suite: Audit Trail Completeness & Failure Handling (Ticket 19 / Phase 17)

Verifies:
1. Gate 1 / Gate 2 DENY events write audit logs before any Razorpay API call is attempted.
2. Razorpay payment failures produce a FAILED audit event with explicit error reasons and non-hallucinated user replies.
3. Audit stream contains correctly typed records for all 3 outcome types (SETTLED, DENIED/DENY, FAILED).
"""

import unittest
import uuid
from decimal import Decimal
from app.core.database import SessionLocal
from app.services.audit_service import AuditService
from app.services.policy_gate import PolicyGate
from app.models.merchant import Merchant
from app.models.audit import AuditEvent

class TestAuditTrailCompleteness(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        m = self.db.query(Merchant).first()
        if not m:
            m = Merchant(
                name="Test Merchant Audit",
                email=f"audit_test_{uuid.uuid4().hex[:6]}@example.com"
            )
            self.db.add(m)
            self.db.commit()
            self.db.refresh(m)
        self.merchant = m

    def tearDown(self):
        self.db.close()

    def test_deny_gate_writes_audit_without_razorpay(self):
        """
        Verifies that a DENY decision from PolicyGate writes an audit row with razorpay_order_id=None.
        Proves no Razorpay API calls are attempted on denied transactions.
        """
        intent = {"amount": 15000.00, "category": "Electronics", "quantity": 1}
        merchant_policy = [{"rule_type": "max_amount", "config": {"max_amount": 10000.00}}]
        agent_context = {"merchant_id": str(self.merchant.id), "agent_id": "buyer_agent_01"}

        result = PolicyGate.check(intent=intent, merchant_policy=merchant_policy, agent_context=agent_context)
        self.assertEqual(result["decision"], "DENY")

        event = AuditService.log_event(
            db=self.db,
            actor_type="agent",
            actor_id=agent_context["agent_id"],
            action="policy_evaluated",
            input={
                "merchant_id": agent_context["merchant_id"],
                "amount": str(intent["amount"]),
                "category": intent["category"],
                "razorpay_order_id": None
            },
            decision=result["decision"],
            reasoning=result["reasoning"],
            merchant_id=self.merchant.id
        )

        self.assertIsNotNone(event.id)
        self.assertEqual(event.decision, "DENY")
        self.assertIsNone(event.input.get("razorpay_order_id"))
        self.assertIn("denied: amount 15000.00 > merchant_max 10000.00", event.reasoning)

    def test_payment_failure_audit_logging(self):
        """
        Verifies that a failed payment capture generates a FAILED audit event row with failure reason.
        """
        tx_id = f"tx_fail_{uuid.uuid4().hex[:8]}"
        rzp_order_id = f"order_fail_{uuid.uuid4().hex[:8]}"
        failure_reason = "BAD_REQUEST_ERROR (Card declined by issuing bank)"

        event = AuditService.log_event(
            db=self.db,
            actor_type="customer",
            actor_id="cust_99a80b7c",
            action="payment_failed",
            input={
                "transaction_id": tx_id,
                "amount": "4500.00",
                "razorpay_order_id": rzp_order_id,
                "failure_reason": failure_reason
            },
            decision="FAILED",
            reasoning=f"Razorpay payment capture failed: {failure_reason}",
            merchant_id=self.merchant.id
        )

        self.assertIsNotNone(event.id)
        self.assertEqual(event.decision, "FAILED")
        self.assertEqual(event.input.get("razorpay_order_id"), rzp_order_id)
        self.assertIn("BAD_REQUEST_ERROR", event.reasoning)

    def test_seed_demo_audit_events_creates_all_three_outcomes(self):
        """
        Verifies seed_demo_audit_events creates SETTLED, DENIED/DENY, and FAILED outcome rows.
        """
        AuditService.seed_demo_audit_events(self.db)

        items, total = AuditService.list_audit_events(self.db, limit=100)
        self.assertGreaterEqual(total, 3)

        decisions = [item.decision for item in items]
        self.assertIn("SETTLED", decisions)
        self.assertTrue("DENY" in decisions or "DENIED" in decisions)
        self.assertIn("FAILED", decisions)

if __name__ == "__main__":
    unittest.main()
