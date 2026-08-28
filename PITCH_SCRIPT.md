# Pitch Video Recording Script — Agentpay (Razorpay AI Buildathon)

**Track**: Track 01 — AI Growth & Agentic Commerce  
**Target Duration**: ~4 minutes 30 seconds (5-minute maximum limit)  
**Core Motto**: *"LLM proposes, engine disposes."*

---

## Timed Video Script Breakdown

### Step 1: Introduction & Problem Statement (0:00 – 0:45 | 45 Seconds)
- **Screen**: Title Slide / Home Page (`https://agentpay-frontend.vercel.app/`)
- **Action**: Show home landing page highlighting the 4 core pillars: Bounded, Explainable, Gated, and Audit-backed.
- **Script Voiceover**:
  > "Welcome! I'm presenting **Agentpay**, an agent-ready commerce platform built for the Razorpay AI Buildathon.
  >
  > As AI buyer agents become mainstream, consumers will delegate purchasing to LLMs. But merchants face a massive trust gap: you cannot hand an AI agent a credit card and hope the LLM doesn't overspend or hallucinate.
  >
  > Agentpay solves this with a strict architectural principle: **LLM proposes, engine disposes**. The LLM never touches payment credentials directly. Every proposed order passes through a deterministic policy gate before a single rupee moves via Razorpay."

---

### Step 2: Merchant Onboarding & Agent-Readable Catalog (0:45 – 1:30 | 45 Seconds)
- **Screen**: Merchant Onboarding Page (`/onboarding`) & Merchant Dashboard (`/dashboard`)
- **Action**: Click "1-Click Quick Seed" or type store details to onboard a merchant in under 2 minutes. Click on the "Agent Schema" tab to reveal the standard `schema.org` JSON-LD export.
- **Script Voiceover**:
  > "First, let's look at how a merchant becomes 'agent-readable'. On the onboarding page, a merchant creates their store and uploads catalog items in under two minutes.
  >
  > Behind the scenes, Agentpay automatically transforms this catalog into standard `schema.org` JSON-LD structured specifications at `/catalog/agent-schema`. Any external AI agent — whether running on Groq, OpenAI, or Claude — can discover product prices, stock, and categories in real time."

---

### Step 3: AI Buyer Agent Query & Live Policy Gate (1:30 – 2:30 | 60 Seconds)
- **Screen**: AI Buyer Agent Simulation Page (`/agent`)
- **Action**: Select the seeded merchant store. Click the preset prompt: *"Order wireless noise-canceling headphones for 450 INR in Electronics"*. Point to the 3 step cards that appear: LLM Proposal → Policy Gate → Razorpay Order Execution.
- **Script Voiceover**:
  > "Now, let's watch an AI buyer agent make a real purchase. I'll prompt our agent: 'Order wireless noise-canceling headphones for 450 INR'.
  >
  > Watch the pipeline execution:
  > 1. First, our Groq Llama-3.3-70B model inspects the catalog and proposes a structured `propose_order` tool call.
  > 2. Next, the proposed action hits our Phase 2 Policy Engine. The policy engine checks the merchant's spend limits — here, maximum single order limit is ₹1,000.
  > 3. Because ₹450 is within limit, the decision is **ALLOW**. The payment service executes a real Razorpay test-mode order (`order_TV...`) and logs the state machine transition."

---

### Step 4: Deliberate Over-Limit Failure Demo (2:30 – 3:30 | 60 Seconds)
- **Screen**: AI Buyer Agent Page (`/agent`) & Terminal SQL query
- **Action**: Click the over-limit preset prompt: *"Order luxury server equipment for 45000 INR in Electronics"*. Point to the red **DENY (BLOCKED BY POLICY)** decision badge and reasoning card.
- **Script Voiceover**:
  > "Now, let's demonstrate our deliberate failure path. What happens if the AI agent tries to make an unauthorized ₹45,000 purchase?
  >
  > The prompt executes. Groq proposes the tool call for ₹45,000. But the policy engine immediately intercepts it before money moves.
  >
  > The policy gate returns a clean **DENY** with explicit human-readable reasoning: *'Denied: Requested amount ₹45,000.00 exceeds merchant maximum single transaction limit of ₹1,000.00.'*
  >
  > Crucially, zero transaction rows were created in PostgreSQL, zero Razorpay API calls were initiated, and zero partial charge occurred. The system blocks gracefully without crashing."

---

### Step 5: Human-in-the-Loop Approval & Immutable Audit Trail (3:30 – 4:30 | 60 Seconds)
- **Screen**: Pending Approval Card on `/agent` & Audit Trail Viewer (`/audit`)
- **Action**: Show a prompt in the grey-zone (e.g. ₹450 with ₹200 approval threshold). Click "Reject" on the pending approval card. Then navigate to `/audit` to view the live, chronological audit events.
- **Script Voiceover**:
  > "For medium-sized purchases above an approval threshold, Agentpay triggers a LangGraph human-in-the-loop state pause. The merchant receives a pending approval card and can click Approve or Reject — here, rejecting it resolves cleanly to a `human_approval_rejected` state.
  >
  > Finally, let's look at the **Audit Trail Viewer** at `/audit`. Every merchant action, policy evaluation, actor ID, reasoning, and payment state transition is recorded in a single append-only PostgreSQL table, protected at the database layer by an immutability trigger.
  >
  > This is Agentpay: explainable, bounded, gated, and audit-backed agentic commerce. Thank you!"

---

## Recording Summary Checklist
- [ ] Total video duration between 4:00 and 4:45.
- [ ] Clear resolution (1080p minimum).
- [ ] Live URLs visible in browser address bar during recording.
- [ ] No local terminal errors or unhandled exceptions shown.
