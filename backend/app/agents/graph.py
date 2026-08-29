import uuid
from typing import Dict, Any, Optional, List, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from app.agents.nodes import llm_node, search_and_compare_node, customer_auth_node, policy_node, execute_node

class AgentGraphState(TypedDict, total=False):
    merchant_id: str
    agent_id: str
    customer_id: Optional[str]
    thread_id: Optional[str]
    prompt: str
    proposed_tool: Optional[str]
    tool_args: Optional[Dict[str, Any]]
    customer_auth_decision: Optional[str]
    policy_decision: Optional[str]
    reasoning: Optional[str]
    transaction_id: Optional[str]
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    payment_link_url: Optional[str]
    pending_approval_id: Optional[str]
    catalog_results: Optional[List[Dict[str, Any]]]
    search_results: Optional[List[Dict[str, Any]]]
    status: str
    response_message: Optional[str]

# Global LangGraph MemorySaver Checkpointer
checkpointer = MemorySaver()

def route_after_llm(state: AgentGraphState) -> str:
    """Routes to search_and_compare_node if discovery tool, END if greeting, else customer_auth_node."""
    if state.get("proposed_tool") == "conversational_greeting":
        return END
    if state.get("proposed_tool") == "search_and_compare":
        return "search_and_compare_node"
    return "customer_auth_node"

def build_agent_graph():
    """
    Builds the Agent Orchestration LangGraph compiled with MemorySaver checkpointer:
    Conditional Routing after LLM Node:
    - search_and_compare -> search_and_compare_node -> END
    - propose_order / get_catalog -> customer_auth_node -> policy_node -> execute_node -> END
    """
    builder = StateGraph(AgentGraphState)

    # Add Nodes
    builder.add_node("llm_node", llm_node)
    builder.add_node("search_and_compare_node", search_and_compare_node)
    builder.add_node("customer_auth_node", customer_auth_node)
    builder.add_node("policy_node", policy_node)
    builder.add_node("execute_node", execute_node)

    # Add Edges
    builder.set_entry_point("llm_node")
    builder.add_conditional_edges(
        "llm_node",
        route_after_llm,
        {
            "search_and_compare_node": "search_and_compare_node",
            "customer_auth_node": "customer_auth_node",
            END: END
        }
    )
    builder.add_edge("search_and_compare_node", END)
    builder.add_edge("customer_auth_node", "policy_node")
    builder.add_edge("policy_node", "execute_node")
    builder.add_edge("execute_node", END)

    return builder.compile(checkpointer=checkpointer)

# Global Compiled Graph with MemorySaver Checkpointer
agent_app = build_agent_graph()

def run_agent_workflow(
    merchant_id: str,
    agent_id: str,
    prompt: str,
    customer_id: Optional[str] = None,
    thread_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the full agent graph workflow for a user/agent prompt with state checkpointing.
    Returns final state including customer authorization decision, policy decision, reasoning, payment outcome, and thread_id.
    """
    if not thread_id:
        thread_id = f"thread_{uuid.uuid4().hex[:12]}"

    initial_state: AgentGraphState = {
        "merchant_id": merchant_id,
        "agent_id": agent_id,
        "customer_id": customer_id,
        "thread_id": thread_id,
        "prompt": prompt,
        "proposed_tool": None,
        "tool_args": {},
        "customer_auth_decision": None,
        "policy_decision": None,
        "reasoning": None,
        "transaction_id": None,
        "razorpay_order_id": None,
        "razorpay_payment_id": None,
        "payment_link_url": None,
        "status": "INITIALIZED"
    }

    config = {"configurable": {"thread_id": thread_id}}
    final_state = agent_app.invoke(initial_state, config=config)
    final_state["thread_id"] = thread_id
    return final_state
