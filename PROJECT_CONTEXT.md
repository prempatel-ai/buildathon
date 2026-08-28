# Project Context: Agent-Ready Merchant Commerce Platform

## 1. What this is
Submission for **Razorpay AI Buildathon**, Track 01 — "AI Growth & Agentic Commerce."
Hiring filter for Razorpay's AI Builder Intern role (₹75k/mo, 6–12mo, Bangalore, in-person from September).
Submission format: public repo + 5-min pitch video + architecture doc. No resume screening — the build is the application.

## 2. Problem statement (official, verbatim)
> Grow the merchant's revenue, and make them sellable to AI buyers. Build an agent that grows revenue for a merchant on Razorpay test-mode APIs, or that makes a merchant transactable by an AI buyer end to end.
> Why now: NPCI's UAP and the global protocol race (ACP, AP2, x402) make agent-to-agent commerce the open problem of the year, and Razorpay's in-app pilots are already live.
> Example directions: Conversational in-app checkout, Agent-readable catalog, Upsell & cross-sell agent, Campaign orchestrator.
> **The bar: Every money action explainable, bounded and gated. Show the audit trail and one failure handled gracefully.**

## 3. Core problem we're solving (our framing)
AI agents can't currently discover what a merchant sells or safely complete a purchase — no standard way for an agent to read a catalog or transact on someone's behalf, especially for small/mid merchants. The real tension: agent autonomy/speed vs. trust/control when money moves. We're not proving "AI can buy things" (solved by big platforms already) — we're proving it can be done **safely, explainably, and provably** for any merchant, not just large ones.

## 4. Competitive/market landscape
**Global (US):**
- OpenAI + Stripe: ACP (Agentic Commerce Protocol)
- Google: AP2 (cryptographic spend-authorization mandates)
- Google + Shopify/Walmart/Target: UCP (merchant-side catalog/checkout standard)
- Coinbase: x402 (HTTP 402 micropayments, crypto rails)
- Visa TAP / Mastercard Agent Pay (signed agent identity, scoped tokens)
- AWS Bedrock AgentCore Payments (spend limits + observability)

**India:**
- Razorpay + NPCI + Claude — live pilot (Feb 2026): order from Zomato/Swiggy/Zepto in-chat, via UPI Reserve Pay (pre-set spend limit, no repeated PIN/OTP)
- Razorpay + NPCI + OpenAI — same on ChatGPT (pilot since Oct 2025)
- NPCI's UAP (Unified Agent Protocol) — national agent-authentication framework, still in development, not live
- **Gap we're targeting:** all current India integrations are hand-built for large platforms only. No self-serve tooling exists for an arbitrary small/mid merchant to become agent-ready. This is the white space.

## 5. Product direction (chosen)
**Agent-readable catalog + bounded/gated conversational checkout** — a self-serve layer any merchant can plug into to become instantly discoverable and transactable by AI buyer agents, using Razorpay test-mode APIs and a Reserve-Pay-style bounded consent model.

Rejected directions: upsell/cross-sell agent (too incremental, weak "why now" story), campaign orchestrator (marketing automation, weak tie to agent-to-agent commerce theme).

## 6. Design philosophy / the non-negotiable principle
**The LLM never touches Razorpay directly.** It only ever proposes a tool call. A policy engine sits structurally between proposal and execution as a mandatory gate. This is what makes the system "explainable, bounded, gated" architecturally — not a prompt-level promise that can be ignored or jailbroken.

> LLM proposes. Engine disposes.

## 7. Architecture

```
Client (Next.js dashboard + agent-facing API)
        ↓
API Gateway (FastAPI — authn/authz, rate limiting)
        ↓
Orchestration Layer (LangGraph graph, Groq LLM as the reasoning node)
        ↓
Policy Engine node (mandatory graph edge — allow / deny / needs_human_approval)
        ↓                              ↓
   (allow) → Execute tool node    (needs_approval) → interrupt, wait for human confirm
        ↓
   [Catalog Service | Payment Service (Razorpay) | Audit Event Store]
        ↓
PostgreSQL + Redis
```

**LangGraph flow (conceptual):**
1. Receive user/agent message
2. Groq LLM node proposes a tool call (get_catalog / propose_order / request_payment) — not executed yet
3. Policy Engine node evaluates: merchant limits, category rules, velocity (Redis sliding-window counters), agent history
4. DENY → log reason + explanation, stop (no execution)
5. NEEDS_APPROVAL → LangGraph human-in-the-loop interrupt, create pending_action, wait for explicit confirm
6. ALLOW → execute via Payment Service with idempotency key → log result
7. Every node transition is a row in `audit_events`, written before the next step runs — this is the audit trail, not a separate logging system

## 8. Services
1. **Agent Orchestration Service** — LangGraph graph, Groq (Llama 3.3 70B, tool-use mode) as reasoning node. Tools defined as strict Pydantic schemas: `get_catalog`, `propose_order`, `request_payment`.
2. **Policy/Limits Engine** — the core IP. Stateless rule evaluator: input = proposed action, output = allow/deny/needs-approval + reason. Rules configurable per-merchant in Postgres (max amount, category allow-list, velocity limits via Redis).
3. **Catalog Service** — CRUD + versioned product schema. Exposes `/catalog/agent-schema` as JSON-LD / MCP-style spec any external agent can query. This is what makes a merchant "agent-readable."
4. **Payment Service** — wraps Razorpay Orders + Payments API (test mode). Idempotency keys mandatory (never double-charge). State machine: `proposed → approved → executing → settled/failed`. Settlement requires an independent Razorpay capture-status check, not signature verification alone.
5. **Audit/Event Store** — append-only Postgres table (enforced by both application code and a DB trigger), never mutated. Single source of truth for explainability, observability, and the audit trail requirement simultaneously.

## 9. Data model

```sql
merchants(id, name, razorpay_key_id, limits_config jsonb)
agents(id, merchant_id, api_key_hash, name)
catalog_items(id, merchant_id, name, price, stock, category)
policies(id, merchant_id, rule_type, config jsonb)
transactions(id, merchant_id, agent_id, amount, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, idempotency_key, error_details)
audit_events(id, actor_type, actor_id, action, input jsonb, decision, reasoning, merchant_id, created_at)
pending_approvals(id, ...)  -- backs the LangGraph human-in-the-loop interrupt
```

## 10. Tech stack

| Layer | Choice | Why |
|---|---|---|
| LLM | Groq API (Llama 3.3 70B, tool-use) | fast, cheap, real-time agent feel; OpenAI-compatible tool-calling |
| Agent framework | LangGraph | explicit graph nodes/edges — policy gate is structural, not hoped-for; native human-in-the-loop interrupts; built-in state persistence for free audit scaffolding |
| API | FastAPI + Pydantic v2 | typed contracts (critical for money-moving code), async |
| DB | PostgreSQL (Supabase/Railway/Render) | ACID, JSONB for flexible policy config |
| Cache/limits | Redis | atomic velocity counters, sliding-window rate limits |
| Payments | Razorpay Python SDK (test mode) | idempotency support, same code path test→live |
| Frontend | Next.js 14 (App Router) + Tailwind + shadcn/ui | merchant dashboard + audit trail viewer |
| Observability | Structured logs → `audit_events` table | one source of truth, not two systems |
| Deploy | Render (backend+DB+Redis) + Vercel (frontend) | live URL, usable by a real customer today |

## 11. Repo structure

```
/backend
  /app
    /agents        # LangGraph graph definition, Groq tool-calling node, prompt templates
    /policy        # rule engine, limit checks
    /services       # catalog, payment (razorpay wrapper), audit
    /models         # SQLAlchemy models
    /schemas        # Pydantic request/response + tool schemas
    /routers        # FastAPI endpoints
    /core           # config, auth, db session
  main.py
/frontend            # Next.js dashboard (audit trail viewer, merchant onboarding)
```

## 12. Demo script (what should be shown in the 5-min pitch video)
1. Onboard a fake small merchant in under 2 minutes (catalog upload → agent-readable schema generated)
2. AI buyer agent queries the catalog, selects an item, initiates purchase
3. Show the policy gate live — the exact moment reasoning + limit check happens, before money moves
4. Execute one successful Razorpay test-mode payment
5. Trigger one deliberate failure (e.g., over spend-limit) → system blocks cleanly, explains why, no crash, no partial charge

## 13. Evaluation bar (grade against this exactly)
- Every money action is **explainable** (reasoning logged, visible)
- Every money action is **bounded** (limits enforced in code, not prompt)
- Every money action is **gated** (approval step before execution)
- **Audit trail** is shown, not claimed
- **One failure** is handled gracefully, not hidden

## 14. Status
Phases 0–5 built and verified (foundation, catalog, policy engine, real Razorpay test-mode payments with capture-status gating, append-only audit trail, LangGraph+Groq agent orchestration). Phase 6 (failure handling & polish) mostly done — over-limit deny and human-rejection paths proven, frontend polished — with live deploy to Render + Vercel as the one outstanding step. Phase 7 (submission prep: README, pitch video, repo cleanup) not started. See `PROJECT_DOCUMENTATION.md` for the full phase-by-phase status and for Phases 8–12, a documented post-submission market-readiness roadmap (security hardening, observability, merchant self-serve, external agent integration, live-mode/compliance readiness) that is explicitly out of scope until the hackathon submission is complete.