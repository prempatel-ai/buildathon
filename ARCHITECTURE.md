# System Architecture — Agentpay Platform

Agentpay is an agent-ready merchant commerce platform built for the **Razorpay AI Buildathon (Track 01: AI Growth & Agentic Commerce)**.

The platform enables merchants to become instantly discoverable and transactable by AI buyer agents, while guaranteeing that every monetary transaction is **bounded**, **explainable**, **gated**, and **audit-backed**.

---

## 1. High-Level Architecture Diagram

```text
  +-----------------------------------------------------------------------+
  |                        Next.js 14 Frontend UI                         |
  |   (/onboarding  |  /dashboard  |  /agent Chat UI  |  /audit Viewer)   |
  +-----------------------------------+-----------------------------------+
                                      | HTTP REST API
                                      v
  +-----------------------------------------------------------------------+
  |                        FastAPI Backend Router                         |
  +-----------------------------------+-----------------------------------+
                                      |
                                      v
  +-----------------------------------------------------------------------+
  |                   LangGraph Agent Orchestrator                        |
  |                (StateGraph + MemorySaver Checkpoint)                  |
  |                                                                       |
  |  +-------------------+     +------------------+     +--------------+  |
  |  |     LLM Node      | --> |   Policy Node    | --> | Execute Node |  |
  |  |  (Groq Llama-3.3) |     | (Phase 2 Engine) |     |  (Razorpay)  |  |
  |  +-------------------+     +------------------+     +--------------+  |
  +-----------------------------------+-----------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-------------------------------+                       +--------------------+
|     Policy & Limits Engine    |                       |  Payment Service   |
| (Max Amount, Category Filter, |                       | (Razorpay Orders & |
| Redis Velocity Rate Limiter)  |                       |  Payments Test API |
+---------------+---------------+                       |  Capture Verification)
                |                                       +---------+----------+
                |                                                 |
                +----------------------------+--------------------+
                                             |
                                             v
                              +------------------------------+
                              | Immutable Audit Event Store  |
                              |  (PostgreSQL + DB Trigger)   |
                              +------------------------------+
```

---

## 2. End-to-End Request Flow & File Citations

### 1. Merchant Onboarding & Schema Export
- **Files**: [`backend/app/routers/catalog.py`](file:///d:/last/backend/app/routers/catalog.py), [`backend/app/services/catalog_service.py`](file:///d:/last/backend/app/services/catalog_service.py)
- **Flow**: Merchant creates store and uploads product catalog items. The platform generates standardized `schema.org` JSON-LD structured schemas (`ItemList` / `Product` / `Offer`) at `/catalog/agent-schema` for AI buyer agent discovery.

### 2. LLM Tool Proposal (Groq + Pydantic Tool Schemas)
- **Files**: [`backend/app/agents/graph.py`](file:///d:/last/backend/app/agents/graph.py), [`backend/app/agents/nodes.py`](file:///d:/last/backend/app/agents/nodes.py), [`backend/app/schemas/tools.py`](file:///d:/last/backend/app/schemas/tools.py)
- **Flow**: User inputs natural language prompt. The Groq LLM node (`openai/gpt-oss-20b` / `llama-3.3-70b-versatile`) parses intent and returns structured tool proposals (`get_catalog` or `propose_order`).

### 3. Bounded Policy Gating (Phase 2 Engine)
- **Files**: [`backend/app/policy/engine.py`](file:///d:/last/backend/app/policy/engine.py), [`backend/app/routers/policy.py`](file:///d:/last/backend/app/routers/policy.py)
- **Flow**: Proposed tool actions pass directly into `evaluate(proposed_action, merchant_limits, agent_history)`. The engine evaluates:
  1. Maximum transaction spend limit (`max_amount`)
  2. Category allowlist / blocklist (`allowed_categories`)
  3. Redis sliding-window velocity rate limiting (`velocity_limit`)
  4. Human approval grey-zone threshold (`approval_threshold`)
- **Outcome**: Returns `ALLOW`, `DENY`, or `NEEDS_APPROVAL` with human-readable reasoning.

### 4. Razorpay Payment Execution & Capture Verification
- **Files**: [`backend/app/services/payment_service.py`](file:///d:/last/backend/app/services/payment_service.py), [`backend/app/routers/payment.py`](file:///d:/last/backend/app/routers/payment.py)
- **Flow**: If policy returns `ALLOW`:
  1. Creates transaction in `PROPOSED` state with mandatory idempotency key.
  2. Transitions state: `PROPOSED → APPROVED → EXECUTING`.
  3. Invokes Razorpay Orders API (`client.order.create`).
  4. Signature verification via `client.utility.verify_payment_signature` AND independent Razorpay API capture check (`client.payment.fetch(payment_id)`) before transitioning to `SETTLED`.

### 5. Immutable Audit Event Store
- **Files**: [`backend/app/services/audit_service.py`](file:///d:/last/backend/app/services/audit_service.py), [`backend/alembic/versions/004_enforce_audit_db_trigger.py`](file:///d:/last/backend/alembic/versions/004_enforce_audit_db_trigger.py)
- **Flow**: Every catalog modification, policy evaluation, state machine transition, and human approval/rejection writes an append-only row to `audit_events`.
- **DB Immutability**: PostgreSQL database trigger `prevent_audit_modification` blocks all `UPDATE` and `DELETE` queries at the database engine level.

---

## 3. Database Model

```sql
merchants(id, name, razorpay_key_id, limits_config jsonb)
agents(id, merchant_id, api_key_hash, name)
catalog_items(id, merchant_id, name, price, stock, category)
policies(id, merchant_id, rule_type, config jsonb)
transactions(id, merchant_id, agent_id, amount, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, idempotency_key, error_details)
audit_events(id, actor_type, actor_id, action, input jsonb, decision, reasoning, merchant_id, created_at)
pending_approvals(id, merchant_id, agent_id, action_type, proposed_action jsonb, status, reasoning, created_at)
```
