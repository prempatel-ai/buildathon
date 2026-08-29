# Pitch Video Recording Script — Agentpay (Razorpay AI Buildathon)

**Track**: Track 01 — AI Growth & Agentic Commerce  
**Target Duration**: ~4 minutes 30 seconds (5-minute maximum limit)  
**Core Motto**: *"LLM proposes, engine disposes."*

---

## Timed Video Script Breakdown

### Step 1: Introduction & Landing Experience (0:00 – 0:45 | 45 Seconds)
- **Screen**: Homepage (`/`)
- **Action**: Show landing page with headline: *"AI agents shop for you — every purchase gated, authorized, and audited"*. Highlight the two primary visitor entry points: **"I'm a Customer"** (`/customer/chat`) and **"I'm a Merchant"** (`/onboarding`).
- **Script Voiceover**:
  > "Welcome! I'm presenting **Agentpay**, an agentic commerce protocol built for the Razorpay AI Buildathon.
  >
  > As AI buyer agents become mainstream, consumers will delegate purchasing to LLMs. But merchants and consumers face a massive trust gap: you cannot hand an AI agent a credit card and hope it doesn't hallucinate or overspend.
  >
  > Agentpay solves this with a strict architectural principle: **LLM proposes, engine disposes**. Every proposed order passes through a dual-gate pipeline — consumer spend limits and merchant policy rules — before a single rupee moves via Razorpay."

---

### Step 2: Consumer Agent Experience & Cross-Merchant Discovery (0:45 – 1:45 | 60 Seconds)
- **Screen**: Consumer Chat AI (`/customer/chat`) & Consumer Portal (`/customer/dashboard`)
- **Action**: Click "I'm a Customer". Type prompt: *"find cheap headphones"*. Show product comparison cards for boAt, JBL, and Sony. Click "Confirm & Buy" on boAt headphones. Show payment execution badge.
- **Script Voiceover**:
  > "Let's start from the consumer experience on `/customer/chat`. Here, a consumer sets a bounded spend authorization limit (e.g. ₹5,000 via UPI Reserve Pay tokenization) and chats naturally with their AI shopping assistant.
  >
  > When I ask 'find cheap headphones', the agent fans out discovery across onboarded merchants — comparing boAt at ₹1,200, JBL at ₹2,499, and Sony at ₹3,990.
  >
  > Crucially, search alone is strictly read-only and creates zero transactions. Only when I confirm 'buy the cheaper one', the agent resolves the selection and routes through both customer authorization and merchant policy gates to execute a real Razorpay order!"

---

### Step 3: Merchant Onboarding & Policy Controls (1:45 – 2:45 | 60 Seconds)
- **Screen**: Merchant Onboarding Page (`/onboarding`), Merchant Dashboard (`/dashboard`), Policy Rules (`/settings`)
- **Action**: Switch to Merchant Context via Navigation bar. Onboard store, show catalog items, and view policy config (Max single order limit: ₹1,000).
- **Script Voiceover**:
  > "Now, let's look at the merchant side. On the merchant admin portal, stores onboard in under two minutes and automatically publish standardized `schema.org` JSON-LD agent specifications at `/catalog/agent-schema`.
  >
  > Merchants define strict governance rules on `/settings` — single-order caps, category blocks, and Redis velocity rate limits. If an agent tries to overspend or purchase a blocked category, the policy engine intercepts it before money moves."

---

### Step 4: Deliberate Over-Limit Failure & Human Approval (2:45 – 3:45 | 60 Seconds)
- **Screen**: Dev Simulator Page (`/agent`)
- **Action**: Access `/agent` (internal dev simulator). Select store and prompt: *"Order luxury server equipment for 45,000 INR"*. Point to red **DENY (BLOCKED BY POLICY)** decision badge.
- **Script Voiceover**:
  > "To verify governance, we test in our developer simulator at `/agent`. If an agent attempts an unauthorized ₹45,000 purchase, the policy engine returns an immediate **DENY** with explicit human reasoning. Zero Razorpay API calls are initiated and zero charge occurs.
  >
  > For medium-sized purchases above an approval threshold, Agentpay triggers a LangGraph human-in-the-loop state pause for merchant review."

---

### Step 5: Multi-Actor Immutable Audit Trail (3:45 – 4:30 | 45 Seconds)
- **Screen**: Audit Trail Viewer (`/audit`)
- **Action**: Navigate to `/audit` to view chronological audit events across Customer, Agent, and Merchant actor types.
- **Script Voiceover**:
  > "Finally, on `/audit`, every search, authorization evaluation, policy check, and payment capture is recorded in a multi-actor append-only PostgreSQL ledger protected by database triggers.
  >
  > This is Agentpay: explainable, bounded, gated, and audit-backed agentic commerce. Thank you!"

---

## Recording Summary Checklist
- [ ] Total video duration between 4:00 and 4:45.
- [ ] Clear resolution (1080p minimum).
- [ ] Live URLs visible in browser address bar during recording.
- [ ] No local terminal errors or unhandled exceptions shown.
