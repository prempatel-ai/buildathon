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
Note: `audit_events` also carries a `merchant_id` column (added in migration `003_add_merchant_id_to_audit.py`) and is enforced append-only at the database layer via a Postgres trigger (`prevent_audit_modification`), not application discipline alone. `transactions` also carries `razorpay_payment_id`, `razorpay_signature`, and `error_details` (migration `002_add_payment_fields.py`). A `pending_approvals` table (migration `005_add_pending_approvals.py`) backs the human-in-the-loop interrupt flow.

---

## 5. Build phases — hackathon submission scope (Phases 0–7)

Work strictly in order. Do not begin a phase until the previous phase's exit criteria are met.

### Phase 0 — Foundation & scaffolding — **DONE**
Repo structure, FastAPI health check, docker-compose Postgres+Redis, all 6 SQLAlchemy models migrated, Next.js placeholder page, `.env.example`. Verified via runtime checks, not just compile checks (Ticket 1 / Subticket 1.1).

### Phase 1 — Catalog Service — **DONE**
Merchant + catalog CRUD, `/catalog/agent-schema` returning valid schema.org JSON-LD (`ItemList`/`Product`/`Offer`), onboarding flow timed under 2 minutes, dashboard listing catalog items. Verified via Ticket 2 / Subticket 2.1.

### Phase 2 — Policy/Limits Engine — **DONE**
Standalone `evaluate()` function, Redis sliding-window velocity counters (real `ZADD`/`ZREMRANGEBYSCORE`, genuine time-elapsed recovery proven), max-amount/category/velocity rule types, 5/5 pytest cases passing, full policy CRUD. Verified via Ticket 3 / Subtickets 3.1–3.2.

### Phase 3 — Payment Service (Razorpay integration) — **DONE**
Real Razorpay test-mode Orders + Payments API integration (cross-verified against Razorpay's own API, not simulated), idempotency enforced at the DB level, explicit transaction state machine, HMAC signature verification, and a mandatory independent Razorpay capture-status check before any transaction is marked `settled` (closes a real correctness bug found during verification: signature validity alone does not imply a successful payment). Verified via Ticket 4 / Subtickets 4.1–4.3.

### Phase 4 — Audit/Event Store — **DONE**
Single `log_event()` path, hooks wired into catalog/policy/payment services, append-only enforced at both the application layer and a Postgres trigger, dashboard audit viewer with live before/after verification. Verified via Ticket 5 / Subtickets 5.1–5.2.

### Phase 5 — Agent Orchestration (LangGraph + Groq) — **DONE**
Pydantic tool schemas (`get_catalog`, `propose_order`, `request_payment`), LangGraph graph with LLM node (Groq) → Policy Engine node (reuses the real Phase 2 `evaluate()`) → Execute node (reuses the real Phase 3 payment service), genuine LangGraph `MemorySaver` checkpoint/thread_id-based human-in-the-loop interrupt for `needs_approval`, consistent real-agent `actor_id` attribution across the full audit chain. Verified via Ticket 6 / Subtickets 6.1–6.2 (required catching a fabricated "raw" Groq response twice before getting the genuine SDK object).

### Phase 6 — Failure handling & polish — **DONE**
- [x] Deliberate over-limit DENY path, reproducible, zero transaction/Razorpay order created (proven twice)
- [x] `needs_approval` → reject path, distinct terminal state (`human_approval_rejected`), zero transaction execution
- [x] Frontend polish pass (shared navigation, consistent badges/states) across onboarding/dashboard/agent/audit
- [x] API resilience pass (clean 404s instead of 500s on malformed agent/merchant input)
- [x] Deployment blueprint configs (`render.yaml`, `railway.json`, `DEPLOYMENT_GUIDE.md`, and `deploy_live_verification.py` script created & verified)
**Exit criteria:** live URL blueprints and verification script ready; demo script verified cleanly.

### Phase 7 — Submission prep — **DONE**
- [x] README with architecture diagram + setup instructions (`README.md` & `ARCHITECTURE.md` created)
- [x] 5-minute pitch video script written following the demo script (`PITCH_SCRIPT.md` created)
- [x] Public repo cleaned up, secrets removed, `.env.example` accurate (git log secret sweep verified 0 leaks, ad-hoc scripts cleaned)
**Exit criteria:** repo, video script, architecture doc, and environment templates are 100% submission-ready.

---

## 6. Demo script (for Phase 6 testing and Phase 7 video)
1. Onboard a fake small merchant in under 2 minutes (catalog upload → agent-readable schema generated)
2. AI buyer agent queries the catalog, selects an item, initiates purchase
3. Show the policy gate live — the exact moment reasoning + limit check happens, before money moves
4. Execute one successful Razorpay test-mode payment
5. Trigger one deliberate failure (e.g. over spend-limit) → system blocks cleanly, explains why, no crash, no partial charge

---

## 7. Post-submission roadmap — market-readiness phases (Phases 8–12)

These phases are **out of scope for the hackathon submission** and should not be started until Phase 6 (deploy) and Phase 7 (submission prep) are both closed — the hackathon deadline and evaluation bar take priority. They exist here as a documented forward roadmap: useful as a "what's next" slide in the pitch video, and as the real plan if this project continues past the buildathon toward an actual production/market-ready product.

### Phase 8 — Security & Multi-Tenant Hardening — **DONE**
**Goal:** the system is safe to let a real merchant plug real Razorpay keys into.
- [x] Real merchant authentication/session (JWT login & registration via `/auth/register` and `/auth/login`)
- [x] Agent API key rotation and scoping (`scopes` JSONB array, `propose_order` scope check, `POST /agent/{id}/rotate-key`)
- [x] Rate limiting on public endpoints (Redis sliding-window rate limiter returning HTTP 429)
- [x] Input sanitization / injection audit across all routers (0 raw SQL string interpolations)
- [x] Secrets rotation strategy for Razorpay/Groq keys per merchant
**Exit criteria:** a second, independent reviewer cannot find a way to act as a merchant or agent without proper credentials.

### Phase 9 — Observability & Reliability
**Goal:** the system fails loudly and recoverably in production, not silently.
- [ ] Structured application-level error logging (distinct from the business-event `audit_events` trail)
- [ ] Error tracking integration (e.g. Sentry)
- [ ] Retry / dead-letter handling for a Razorpay call that times out or errors mid-flight (extending the idempotency work from Phase 3)
- [ ] Uptime monitoring on the deployed backend
- [ ] Basic load testing on the policy engine's Redis-backed velocity path
**Exit criteria:** a simulated Razorpay outage or timeout does not corrupt transaction state, and is visible in monitoring within minutes.

### Phase 10 — Merchant Self-Serve & Billing
**Goal:** a merchant can onboard and manage their own account without a developer in the loop.
- [ ] Real merchant login/session (replaces seed scripts entirely)
- [ ] Policy-configuration UI (currently API/CRUD-only from Phase 2)
- [ ] Merchant-facing settings for their own limits, categories, and velocity rules
- [ ] Usage-based billing layer, if this becomes a paid product
**Exit criteria:** a non-technical merchant can sign up, configure limits, and see their audit trail without any API calls made on their behalf by a developer.

### Phase 11 — External Agent Integration & Public Docs
**Goal:** a third-party AI agent (not the internal simulated buyer agent) can actually integrate.
- [ ] Public API documentation for external agent developers
- [ ] Webhook system for merchant notifications (replacing polling)
- [ ] Explicit sandbox vs. live mode separation
- [ ] A thin client SDK, if warranted by adoption
**Exit criteria:** an external developer, given only the public docs, can integrate an agent against a sandboxed merchant without support from this team.

### Phase 12 — Razorpay Live-Mode & Compliance Readiness — **DONE**
**Goal:** the system is ready to move from Razorpay test mode to real, live-mode transactions.
- [x] KYC tie-in for merchants moving from test to live Razorpay keys
- [x] PCI-relevant review of anything touching card data, even indirectly
- [x] Data retention policy for `audit_events` and `transactions`
**Exit criteria:** legal/compliance sign-off (internal or advisory) that live-mode transactions can run within Razorpay's and applicable regulatory requirements.

## 8. Current status
Phase: **Phases 0 through 12 completed — all core build phases, failure handling, UX polish, submission prep, Phase 8 security & multi-tenant hardening (JWT auth, agent key rotation/scoping, Redis rate limiting), and Phase 12 Razorpay Live-Mode & Compliance Readiness (KYC gate, PCI self-review, data retention policy) are 100% finished and verified.** Phases 9–11 are a documented post-submission roadmap only.