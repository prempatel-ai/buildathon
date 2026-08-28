from uuid import UUID
from decimal import Decimal
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.agents.graph import run_agent_workflow
from app.models.agent import PendingApproval, Agent
from app.services.payment_service import PaymentService
from app.schemas.transaction import PaymentOrderCreate
from app.services.audit_service import AuditService

router = APIRouter(prefix="/agent", tags=["Agent Orchestration"])

class AgentChatRequest(BaseModel):
    merchant_id: UUID = Field(..., description="ID of merchant store")
    agent_id: Optional[str] = Field("buyer_agent_01", description="ID or key of buyer agent")
    prompt: str = Field(..., min_length=1, description="Natural language prompt for AI agent")

class PendingApprovalActionRequest(BaseModel):
    action: str = Field(..., description="'approve' or 'reject'")
    merchant_id: UUID = Field(..., description="Merchant ID confirming action")

class AgentChatResponse(BaseModel):
    merchant_id: str
    agent_id: str
    prompt: str
    proposed_tool: Optional[str] = None
    tool_args: Optional[Dict[str, Any]] = None
    policy_decision: Optional[str] = None
    reasoning: Optional[str] = None
    transaction_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    pending_approval_id: Optional[str] = None
    catalog_results: Optional[List[Dict[str, Any]]] = None
    status: str
    response_message: str

@router.post("/chat", response_model=AgentChatResponse)
def agent_chat_endpoint(req: AgentChatRequest, db: Session = Depends(get_db)):
    """
    Executes the LangGraph Agent Orchestration flow for a prompt.
    LLM tool proposals strictly route through the Phase 2 policy gate before Phase 3 payment execution.
    """
    result = run_agent_workflow(
        merchant_id=str(req.merchant_id),
        agent_id=req.agent_id or "buyer_agent_01",
        prompt=req.prompt
    )
    return AgentChatResponse(
        merchant_id=str(req.merchant_id),
        agent_id=req.agent_id or "buyer_agent_01",
        prompt=req.prompt,
        proposed_tool=result.get("proposed_tool"),
        tool_args=result.get("tool_args"),
        policy_decision=result.get("policy_decision"),
        reasoning=result.get("reasoning"),
        transaction_id=result.get("transaction_id"),
        razorpay_order_id=result.get("razorpay_order_id"),
        pending_approval_id=result.get("pending_approval_id"),
        catalog_results=result.get("catalog_results"),
        status=result.get("status", "UNKNOWN"),
        response_message=result.get("response_message", "Completed agent request.")
    )

@router.get("/pending")
def list_pending_approvals(merchant_id: UUID, db: Session = Depends(get_db)):
    """
    Lists pending human-in-the-loop approval requests for a merchant.
    """
    pending = db.query(PendingApproval).filter(
        PendingApproval.merchant_id == merchant_id,
        PendingApproval.status == "pending"
    ).order_by(PendingApproval.created_at.desc()).all()
    
    return [
        {
            "id": str(p.id),
            "merchant_id": str(p.merchant_id),
            "agent_id": p.agent_id,
            "action_type": p.action_type,
            "proposed_action": p.proposed_action,
            "status": p.status,
            "reasoning": p.reasoning,
            "created_at": p.created_at.isoformat()
        }
        for p in pending
    ]

@router.post("/approve/{pending_id}")
def approve_pending_action(pending_id: UUID, req: PendingApprovalActionRequest, db: Session = Depends(get_db)):
    """
    Merchant approves or rejects a pending human-in-the-loop approval request.
    On approval: resumes execution to create Razorpay test order.
    """
    pending = db.query(PendingApproval).filter(
        PendingApproval.id == pending_id,
        PendingApproval.merchant_id == req.merchant_id
    ).first()

    if not pending:
        raise HTTPException(status_code=404, detail="Pending approval request not found.")

    if pending.status != "pending":
        raise HTTPException(status_code=400, detail=f"Pending approval request is already in '{pending.status}' status.")

    if req.action.lower() == "approve":
        pending.status = "approved"
        db.commit()

        # Execute Payment Order after Human Approval
        action_data = pending.proposed_action
        amount = Decimal(str(action_data.get("amount", "0")))
        idempotency_key = f"idemp_human_appr_{pending.id.hex[:8]}"

        tx_create = PaymentOrderCreate(
            merchant_id=req.merchant_id,
            amount=amount,
            idempotency_key=idempotency_key,
            receipt=f"rcpt_appr_{pending.id.hex[:4]}"
        )
        tx = PaymentService.create_payment_order(db, tx_create)

        AuditService.log_event(
            db=db,
            actor_type="merchant",
            actor_id=str(req.merchant_id),
            action="human_approval_granted",
            input={"pending_id": str(pending_id), "transaction_id": str(tx.id)},
            decision="APPROVED",
            reasoning=f"Merchant explicitly approved pending action {pending_id}. Transaction {tx.id} executed.",
            merchant_id=req.merchant_id
        )

        return {
            "message": "Approved successfully. Payment order created.",
            "pending_id": str(pending_id),
            "status": "approved",
            "transaction_id": str(tx.id),
            "razorpay_order_id": tx.razorpay_order_id
        }
    else:
        pending.status = "rejected"
        db.commit()

        AuditService.log_event(
            db=db,
            actor_type="merchant",
            actor_id=str(req.merchant_id),
            action="human_approval_rejected",
            input={"pending_id": str(pending_id)},
            decision="REJECTED",
            reasoning=f"Merchant explicitly rejected pending action {pending_id}.",
            merchant_id=req.merchant_id
        )

        return {
            "message": "Pending action rejected.",
            "pending_id": str(pending_id),
            "status": "rejected"
        }
