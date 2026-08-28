# CLAUDE.md

This file gives Claude Code full context for working on this repo. Read `PROJECT_DOCUMENTATION.md` before starting any task — it has the phase breakdown and current status.

## Project
Agent-ready merchant commerce platform — Razorpay AI Buildathon (Track 01: AI Growth & Agentic Commerce). Full context: see `PROJECT_DOCUMENTATION.md`.

Core principle to enforce in every piece of code touching money: **the LLM never calls Razorpay directly. It proposes a tool call. A policy engine gates it. Only then does execution happen.** Do not weaken this boundary for convenience.

## How we work: build in phases, not all at once
Do not attempt to build the whole system in one pass. Work strictly one phase at a time, in the order defined in `PROJECT_DOCUMENTATION.md`.

Rules:
- Before starting a phase, state which phase you're on and what "done" looks like for it.
- Do not start the next phase until the current phase's exit criteria (in `PROJECT_DOCUMENTATION.md`) are met.
- After finishing a phase, update `PROJECT_DOCUMENTATION.md` — mark tasks done, note any deviations or decisions made.
- If a phase turns out to need something from a later phase, stop and flag it — don't silently pull work forward.
- Keep each phase's diff reviewable — don't bundle unrelated phases into one commit/PR.

## Scope gate: hackathon submission (Phases 0–7) vs. post-submission roadmap (Phases 8–12)
`PROJECT_DOCUMENTATION.md` now documents two tiers of phases:
- **Phases 0–7** are the actual hackathon submission scope, graded against the evaluation bar in section 2. This is the current priority.
- **Phases 8–12** (security hardening, observability, merchant self-serve, external agent integration, live-mode/compliance readiness) are a documented **post-submission roadmap** — real future work, not part of this submission.

**Do not start work on Phase 8 or later until Phase 6 (deploy) and Phase 7 (submission prep) are both marked done in `PROJECT_DOCUMENTATION.md`.** If asked to work on a Phase 8+ item before then, flag that Phases 6–7 are still open rather than proceeding.

## Skills to use on this project
Use these as if they were installed skills — apply their checklist/discipline every time relevant code is touched, even if not explicitly asked.

### `money-action-gate` skill
Applies to: any code that proposes, approves, or executes a payment or spend action.
- Every money-moving function must go through the policy engine — no direct Razorpay calls from agent/LLM code paths.
- Every decision (allow/deny/needs_approval) must be logged to `audit_events` with a `reasoning` field, before execution proceeds.
- Idempotency key required on every payment execution call.
- Never let a retry silently re-execute a payment — check transaction state first.
- Signature verification alone is not proof of a successful payment — always independently confirm capture status via Razorpay's own API before marking a transaction `settled` (this was a real bug found and fixed during Phase 3).

### `agent-tool-schema` skill
Applies to: defining any tool the LLM can call.
- Tools are strict Pydantic v2 schemas — no free-text params where a structured field will do.
- Every tool has a docstring explaining exactly when the LLM should call it and what it does NOT do (e.g. `propose_order` does not charge money).
- Tool outputs returned to the LLM should be minimal and structured — don't dump raw DB rows.

### `audit-trail` skill
Applies to: any state transition in the LangGraph flow.
- Every node transition writes one `audit_events` row before moving to the next node.
- Log fields: `actor_type`, `actor_id`, `action`, `input`, `decision`, `reasoning`, `created_at`.
- `actor_id` must reflect the real requesting agent/merchant consistently across an entire chain of events for one action — not a mix of the real agent ID at one step and a hardcoded literal (e.g. `"system"`, `"payment_service"`) at another.
- The audit table is append-only — never update or delete rows from application code. This repo also enforces this at the database layer via a Postgres trigger; do not remove or weaken that trigger.

### `graceful-failure` skill
Applies to: any place a proposed action can be denied or fail.
- A denial must return a human-readable reason, not just a status code.
- A failed payment must leave the system in a consistent state (no partial charge, no orphaned pending transaction).
- At least one failure path per feature must have a test or demo case — don't only build the happy path.
- A human-rejected `needs_approval` action must resolve to a distinct terminal state from a policy `deny` (this repo uses `human_approval_rejected`) — don't collapse the two.

### `merchant-onboarding-ux` skill
Applies to: catalog upload / merchant setup flow.
- Onboarding a new merchant (catalog + limits config) should be completable in under 2 minutes — this is a stated demo requirement.
- Generated `/catalog/agent-schema` output must be valid structured JSON-LD/MCP-style schema, testable independently of the agent.

## Verification discipline (project-specific, learned the hard way)
This project has a repeated pattern where "done" reports understated what was actually verified — simulated Razorpay IDs presented as real, a hand-summarized "raw" LLM response presented as the actual SDK object, deploy config files presented as an actual deployment, compile-only checks standing in for runtime checks. When reporting a phase/ticket as complete:
- Prefer pasting real, unedited command/API output over a summarized description of it.
- If something is simulated, mocked, or not yet actually run against a live external service, say so explicitly rather than letting it read as verified.
- Real Razorpay IDs, Groq response objects, and deployment URLs all have a recognizable shape — don't reconstruct them by hand.

## Conventions
- Backend: FastAPI + Pydantic v2 + SQLAlchemy, Python.
- Agent orchestration: LangGraph, Groq (Llama 3.3 70B) as the LLM node.
- DB: PostgreSQL (via SQLAlchemy models in `/backend/app/models`), Redis for limits/velocity counters.
- Frontend: Next.js 14 App Router + Tailwind + shadcn/ui.
- Follow the repo structure defined in `PROJECT_DOCUMENTATION.md` — don't introduce new top-level folders without updating that doc.

## When in doubt
Re-check the evaluation bar in `PROJECT_DOCUMENTATION.md` section "Evaluation bar" before marking any phase complete: explainable, bounded, gated, audit trail shown, one failure handled gracefully.