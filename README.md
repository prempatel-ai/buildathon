# Agentpay — Agent-Ready Merchant Commerce Platform

> **Razorpay AI Buildathon Submission**  
> **Track**: Track 01 — AI Growth & Agentic Commerce  
> **Core Principle**: *"LLM proposes, engine disposes."*

Agentpay is an agent-ready merchant commerce platform that empowers any small or mid-sized merchant to become discoverable and transactable by AI buyer agents.

Every monetary transaction initiated by an AI agent is **bounded**, **explainable**, **gated**, and backed by an **immutable audit trail** before money moves via real Razorpay test-mode payments.

---

## 1. Problem Statement & Architectural Principle

As AI buyer agents automate consumer purchasing, merchants face a critical trust gap: **LLMs cannot be trusted with raw payment credentials or unconstrained spend limits**.

### The Solution: *"LLM proposes, engine disposes"*
1. **The LLM never executes payments directly**: The AI agent proposes structured intent (`propose_order`).
2. **The Policy Engine evaluates intent**: A deterministic, rule-based policy gate checks spend limits, allowed categories, and velocity rate limits.
3. **The Payment Service executes safely**: Payments are processed through Razorpay's API only after policy clearance (`ALLOW`), backed by DB-level idempotency protection and live capture verification.
4. **The Audit Store logs everything**: Every decision, reasoning payload, and state machine transition is logged to a PostgreSQL append-only audit trail enforced by a database trigger.

---

## 2. Architecture Overview

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

For complete technical details, code citations, and data models, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 3. Technology Stack

- **Backend**: FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Python 3.10+
- **Agent Orchestration**: LangGraph, Groq Llama-3.3 70B (`openai/gpt-oss-20b`), Pydantic Tool Schemas
- **Database & Cache**: PostgreSQL 16 (with immutability trigger), Redis 7 (sliding-window rate limiting)
- **Payments**: Razorpay Python SDK (Test Mode, Orders & Payments API, HMAC SHA256 Verification, Capture Gating)
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Deployment**: Render.com (Backend + Postgres + Redis), Vercel (Frontend)

---

## 4. Local Quickstart Setup

### Prerequisites
- Docker Desktop
- Python 3.10+
- Node.js 18+

### Step 1: Clone & Configure Environment
```bash
git clone https://github.com/prempatel-ai/buildathon.git
cd buildathon
cp .env.example .env
```

### Step 2: Start Infrastructure (PostgreSQL & Redis)
```bash
cd infra
docker compose up -d
cd ..
```

### Step 3: Setup & Launch Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python main.py
```
Backend API will be running at `http://localhost:8000` (Docs: `http://localhost:8000/docs`).

### Step 4: Run Backend Test Suite
```bash
python -m pytest tests/ -v
```

### Step 5: Setup & Launch Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend UI will be running at `http://localhost:3000`.

---

## 5. Live Deployment & Video Script

- **Deployment Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for Render & Vercel deployment blueprints.
- **Pitch Video Script**: See [PITCH_SCRIPT.md](PITCH_SCRIPT.md) for the timed 5-minute recording script.
- **Live Backend URL**: `https://agentpay-backend.onrender.com` (Placeholder)
- **Live Frontend URL**: `https://agentpay-frontend.vercel.app` (Placeholder)

---

## 6. Project Documentation
- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) — Comprehensive phase-by-phase build logs and evaluation criteria.
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — Product requirements, market context, and design rationale.
