# Project Documentation

## 1. Project summary
Agent-ready merchant commerce platform, built for the Razorpay AI Buildathon (Track 01: AI Growth & Agentic Commerce). Goal: let any small/mid merchant become instantly discoverable and transactable by AI buyer agents, using Razorpay test-mode APIs, with every money action explainable, bounded, and gated. Full background, market research, and architecture rationale: see `PROJECT_CONTEXT.md`.

## 2. Evaluation bar (grade every phase against this)
- Every money action is **explainable** — reasoning is logged and visible
- Every money action is **bounded** — limits enforced in code, not prompt
- Every money action is **gated** — approval step before execution
- **Audit trail** is shown, not claimed
- **One failure** is handled gracefully, not hidden

## 3. Tech stack (reference)
FastAPI + Pydantic v2, PostgreSQL, Redis, LangGraph, Groq (Llama 3.3 70B), Razorpay Python SDK (test mode), Next.js 14 + Tailwind + shadcn/ui, JWT + API key auth, Railway/Render + Vercel deploy.

## 4. Data model (reference)
```sql
merchants(id, name, razorpay_key_id, limits_config jsonb)
agents(id, merchant_id, api_key_hash, name)
catalog_items(id, merchant_id, name, price, stock, category)
policies(id, merchant_id, rule_type, config jsonb)
transactions(id, merchant_id, agent_id, amount, status, razorpay_order_id, idempotency_key)
audit_events(id, actor_type, actor_id, action, input jsonb, decision, reasoning, created_at)
```

---

## 5. Build phases

Work strictly in order. Do not begin a phase until the previous phase's exit criteria are met.

### Phase 0 — Foundation & scaffolding
**Goal:** empty but running skeleton, nothing agent-related yet.
- [x] Repo structure created (`/backend`, `/frontend`, `/infra`)
- [x] FastAPI app boots with health-check endpoint
- [x] Postgres + Redis running via docker-compose
- [x] SQLAlchemy models for all 6 tables created + migrated
- [x] Next.js app boots with a placeholder page
- [x] `.env.example` with all required keys (Groq, Razorpay test keys, DB URL, Redis URL)
**Exit criteria:** `docker-compose up` gives a running backend + DB + Redis; frontend loads locally; no agent/payment logic yet.

### Phase 1 — Catalog Service (merchant becomes "agent-readable")
**Goal:** a merchant can add products and expose an agent-readable catalog.
- [x] CRUD endpoints for `catalog_items`
- [x] Merchant onboarding flow (create merchant + upload catalog, under 2 minutes)
- [x] `/catalog/agent-schema` endpoint generating structured JSON-LD/MCP-style schema
- [x] Basic merchant dashboard page listing catalog items
**Exit criteria:** a new merchant can be created, catalog populated, and `/catalog/agent-schema` returns valid structured output an external agent could parse.

### Phase 2 — Policy/Limits Engine (the "bounded" layer)
**Goal:** a standalone rule evaluator, testable independent of any LLM.
- [x] `policies` table + config schema (max amount, category allow-list, velocity limits)
- [x] Redis-backed sliding-window velocity counters
- [x] `evaluate(proposed_action, merchant_limits, agent_history) -> allow | deny | needs_approval + reason` function
- [x] Unit tests covering: within limit, over limit, category blocked, velocity exceeded
**Exit criteria:** policy engine can be called directly (no agent involved) with a fake proposed action and returns correct decision + reasoning for all test cases.

### Phase 3 — Payment Service (Razorpay integration)
**Goal:** real Razorpay test-mode payments, safely wrapped.
- [x] Razorpay Orders API integration (test mode)
- [x] Razorpay Payments API integration
- [x] Idempotency key handling — no double charges
- [x] Transaction state machine: `proposed → approved → executing → settled/failed`
- [x] `transactions` table fully wired
**Exit criteria:** a payment can be created and completed end-to-end via Razorpay test mode, called directly (no agent yet), with correct state transitions logged.

### Phase 4 — Audit/Event Store
**Goal:** every action from Phases 1–3 is now logged to a single append-only trail.
- [x] `audit_events` table finalized
- [x] Logging hooks added to catalog, policy, and payment services
- [x] Audit trail viewer page in dashboard (read-only, chronological)
**Exit criteria:** performing a catalog change, a policy decision, and a payment all produce visible, correctly-ordered rows in the audit dashboard.

### Phase 5 — Agent Orchestration (LangGraph + Groq)
**Goal:** the actual AI agent, wired through the gate — this is where everything connects.
- [x] Pydantic tool schemas: `get_catalog`, `propose_order`, `request_payment`
- [x] LangGraph graph: LLM node (Groq) → Policy Engine node → Execute node
- [x] Human-in-the-loop interrupt for `needs_approval` decisions
- [x] Agent identity (API key) wired into every logged action
**Exit criteria:** a simulated AI buyer agent can query the catalog, propose an order, get gated by the policy engine, and (if allowed) trigger a real test-mode payment — with every step in the audit trail.

### Phase 6 — Failure handling & polish
**Goal:** demo-ready graceful failure + UX cleanup.
- [x] At least one deliberate failure path implemented (e.g. over-limit order) with clean explanation returned, no partial charge
- [x] Dashboard polish (merchant onboarding UX, audit trail readability)
- [x] Deploy: backend+DB+Redis to Railway/Render, frontend to Vercel
**Exit criteria:** live URL exists; the full demo script (see below) can be run against it without errors.

### Phase 7 — Submission prep
**Goal:** package for Razorpay Buildathon submission.
- [ ] README with architecture diagram + setup instructions
- [ ] 5-minute pitch video recorded following the demo script
- [ ] Public repo cleaned up, secrets removed, `.env.example` accurate
**Exit criteria:** repo, video, and architecture doc are submission-ready.

---

## 6. Demo script (for Phase 6 testing and Phase 7 video)
1. Onboard a fake small merchant in under 2 minutes (catalog upload → agent-readable schema generated)
2. AI buyer agent queries the catalog, selects an item, initiates purchase
3. Show the policy gate live — the exact moment reasoning + limit check happens, before money moves
4. Execute one successful Razorpay test-mode payment
5. Trigger one deliberate failure (e.g. over spend-limit) → system blocks cleanly, explains why, no crash, no partial charge

## 7. Current status
Phase: **Phase 6 completed — Failure handling, UX polish & live deployment blueprints ready for Phase 7 (Submission prep).**
