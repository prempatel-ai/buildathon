from typing import Dict, Any, Optional, List, TypedDict
from langgraph.graph import StateGraph, END
from app.agents.nodes import llm_node, policy_node, execute_node

class AgentGraphState(TypedDict, total=False):
    merchant_id: str
    agent_id: str
    prompt: str
    proposed_tool: Optional[str]
    tool_args: Optional[Dict[str, Any]]
    policy_decision: Optional[str]
    reasoning: Optional[str]
    transaction_id: Optional[str]
    razorpay_order_id: Optional[str]
    pending_approval_id: Optional[str]
    catalog_results: Optional[List[Dict[str, Any]]]
    status: str
    response_message: Optional[str]

def build_agent_graph():
    """
    Builds the Agent Orchestration LangGraph:
    LLM Node (Groq) -> Policy Engine Node (Real evaluate()) -> Execute Node (Real PaymentService / CatalogService).
    """
    builder = StateGraph(AgentGraphState)

    # Add Nodes
    builder.add_node("llm_node", llm_node)
    builder.add_node("policy_node", policy_node)
    builder.add_node("execute_node", execute_node)

    # Add Edges
    builder.set_entry_point("llm_node")
    builder.add_edge("llm_node", "policy_node")
    builder.add_edge("policy_node", "execute_node")
    builder.add_edge("execute_node", END)

    return builder.compile()

# Global Compiled Graph
agent_app = build_agent_graph()

def run_agent_workflow(merchant_id: str, agent_id: str, prompt: str) -> Dict[str, Any]:
    """
    Executes the full agent graph workflow for a user/agent prompt.
    Returns final state including policy decision, reasoning, and payment outcome.
    """
    initial_state: AgentGraphState = {
        "merchant_id": merchant_id,
        "agent_id": agent_id,
        "prompt": prompt,
        "proposed_tool": None,
        "tool_args": {},
        "policy_decision": None,
        "reasoning": None,
        "status": "INITIALIZED"
    }

    final_state = agent_app.invoke(initial_state)
    return final_state
