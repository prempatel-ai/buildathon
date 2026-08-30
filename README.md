# Agentpay — Autonomous AI Commerce & Dual-Gated Settlement Protocol

> **Razorpay AI Buildathon Submission**  
> **Track**: Track 01 — AI Growth & Agentic Commerce  
> **Core Principle**: *"LLM proposes, engine disposes."*

---

## 1. Executive Summary & Mission

**Agentpay** is the first **dual-gated, agent-readable commerce infrastructure** designed to connect autonomous AI buyer agents with Razorpay payments safely, transparently, and deterministically.

As AI agents (built on LangGraph, Groq Llama 3.3 70B, AutoGPT, OpenAI Assistants, and Anthropic Claude) evolve from basic recommendation bots into autonomous financial delegates, traditional e-commerce gateways fail. Giving raw credit card numbers or unrestricted API access to LLMs risks runaway spend loops, prompt injection attacks, unverified merchant stock depletion, and zero financial explainability.

**Agentpay solves this paradigm shift** by introducing a **Dual-Gated Protocol**:
1. **Consumer Spend Vault Gate**: Tokenized UPI e-mandates with strict user-configured spend limits, rolling velocity caps, and allowed category rules.
2. **Merchant Policy Engine Gate**: High-throughput rule evaluation powered by Groq Llama 3.3 70B LLM checks, evaluating merchant max order limits, live catalog inventory, and Redis sliding-window velocity rate-limiting per agent key.
3. **Razorpay Live Settlement & Webhooks**: 2-step payment capture signature verification (`Razorpay Order` -> `Payment Capture Verification`) and real-time HMAC SHA-256 signed HTTP POST webhooks.
4. **Append-Only Multi-Actor Audit Ledger**: Immutable PostgreSQL audit trail recording every evaluation decision, reasoning payload, and transaction state across `Customer`, `Agent`, and `Merchant` actor types.

---

## 2. The Problem We Are Solving

```text
    TRADITIONAL E-COMMERCE GATEWAY                      AGENTPAY DUAL-GATED PROTOCOL
 +----------------------------------+             +----------------------------------+
 | Human user enters card details   |             | AI Agent proposes structured     |
 | Interactive 2FA / 3DS OTP prompt |             | purchase intent (propose_order) |
 | Static HTML checkout forms       |             |                                  |
 +----------------------------------+             +----------------------------------+
                  |                                                |
                  v                                                v
    Fails for Autonomous AI Agents!                +----------------------------------+
   (Agents cannot answer SMS OTPs                  | Gate 1: Consumer Spend Vault     |
    or click interactive 3DS frames)               | Gate 2: Merchant Policy Engine   |
                                                   | Gate 3: Razorpay Live Capture     |
                                                   +----------------------------------+
                                                                   |
                                                                   v
                                                    Deterministic & Safe Settlement!
```

### Key Security & Architectural Challenges Solved:
* **The LLM Hallucination Risk**: LLMs cannot be trusted with raw financial execution. Agentpay enforces *"LLM proposes, engine disposes"*. The LLM proposes structured intent (`propose_order`), but deterministic engine gates evaluate constraints before any money moves.
* **Lack of Agent-Readable Catalogs**: Merchants currently host HTML sites for human eyes. Agentpay automatically generates standardized **Schema.org JSON-LD Agent Product Feeds** (`GET /catalog/agent-schema`) so any AI agent can inspect stock, prices, and variants instantly.
* **Onboarding Friction**: Existing Shopify / WooCommerce merchants cannot rewrite their store for AI agents. Agentpay includes a **1-Click Live Shopify Store Auto-Sync Connector** (`POST /catalog/shopify-sync`) that fetches live products, variants, pricing, and stock in under 2 seconds.
* **Regulatory Auditability**: Financial compliance requires complete traceability. Agentpay logs every intent, policy decision, reasoning payload, and Razorpay payment ID to an immutable PostgreSQL append-only audit ledger.

---

## 3. Architecture & System Flow

```text
+---------------------------------------------------------------------------------------------------+
|                                 CONSUMER & MERCHANT WEB CONSOLE                                   |
|       (/  |  /customer/chat  |  /dashboard  |  /agents-list  |  /audit  |  /webhooks  |  /health)      |
+-------------------------------------------------+-------------------------------------------------+
                                                  | HTTP REST API
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                   FASTAPI BACKEND ROUTER ENGINE                                   |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                   LANGGRAPH AGENT ORCHESTRATOR                                    |
|                                (Groq Llama-3.3 70B + StateGraph)                                  |
|                                                                                                   |
|  +------------------------+      +------------------------+      +-----------------------------+  |
|  |     Customer Vault     | ---> | Merchant Policy Gate   | ---> |   Razorpay Settlement Engine |  |
|  |  (Tokenized Mandate)   |      |  (Groq + Redis Rate)   |      |   (2-Step Capture Verify)   |  |
|  +------------------------+      +------------------------+      +-----------------------------+  |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
       +------------------------------------------+------------------------------------------+
       |                                                                                     |
       v                                                                                     v
+-------------------------------+                                           +----------------------------------+
|     Redis Rate Limiter        |                                           |     HMAC SHA-256 Webhook Service  |
| (Sliding Window per Agent Key)|                                           |   (3-Attempt Exponential Backoff)|
+---------------+---------------+                                           +----------------+-----------------+
                |                                                                            |
                +------------------------------------+---------------------------------------+
                                                     |
                                                     v
                                      +------------------------------+
                                      | PostgreSQL Immutable Ledger  |
                                      |   (Append-Only Audit Trigger)|
                                      +------------------------------+
```

---

## 4. Complete User & Operational Flows

### A. Consumer Journey (Buyer AI Delegated Purchasing)
1. **Sign In & Vault Setup** (`/customer/dashboard`):
   - The consumer logs in and creates a tokenized payment authorization (saved card or UPI e-mandate).
   - Configures maximum per-transaction spend limit (e.g., ₹5,000.00).
2. **Natural Language AI Shopping Assistant** (`/customer/chat`):
   - Consumer prompts the AI agent: *"Buy boAt Rockerz 450 Wireless Headphones under ₹2,500"*.
3. **Dual-Gate Execution**:
   - **Gate 1**: System verifies consumer's remaining spend limit (₹2,499.00 <= ₹5,000.00 -> `ALLOW`).
   - **Gate 2**: System verifies merchant max order cap and Groq Llama 3.3 70B policy check -> `ALLOW`.
   - **Settlement**: System creates a Razorpay Order, executes 2-step payment capture signature verification, updates remaining balance to ₹2,501.00, and logs the PostgreSQL audit record.

### B. Merchant Journey (Store Governance & Agent Integration)
1. **Console Access & Onboarding** (`/dashboard`, `/login`):
   - Merchant registers, sets KYC environment (`LIVE API` vs `SANDBOX API`), and configures payment settings.
2. **Catalog Management & Shopify Sync**:
   - **Single Item Management**: Add, edit, or delete individual catalog items with stock tracking.
   - **Bulk CSV / JSON Import**: Paste bulk JSON/CSV product lists to import hundreds of items at once.
   - **1-Click Live Shopify Store Auto-Sync** (`POST /catalog/shopify-sync`): Enter any Shopify store URL (e.g. `boat-lifestyle.myshopify.com` or custom domain) to auto-fetch live products, variant pricing, inventory stock, and categories in < 2 seconds.
   - **Schema.org Agent Feed** (`GET /catalog/agent-schema`): Auto-generates a standardized JSON-LD product feed for external AI buyer agents.
3. **Agent Key Lifecycle Management** (`/agents-list`):
   - Issue external agent API keys with granular scopes (`read_catalog`, `propose_order`).
   - Rotate key secrets or revoke key access in 1 click.
4. **Merchant Policy Engine Settings** (`/settings`):
   - Set max single transaction amount, auto-approve threshold, category whitelists/blacklists, and Redis velocity rate limits.
5. **Webhook Deliverability** (`/webhooks`):
   - Configure live HTTPS webhook endpoints, inspect HMAC SHA-256 signing secret (`X-Agentpay-Signature`), toggle secret visibility, and fire test deliveries.
6. **Multi-Actor Audit Explorer** (`/audit`):
   - Filter, search, and sort chronological audit records across `Customer`, `Agent`, and `Merchant` actor actions.

---

## 5. Exhaustive REST API Specifications

### Agent & AI Execution Endpoints

#### 1. `POST /agent/chat`
* **Description**: Primary endpoint for AI buyer agents to execute natural language shopping queries, evaluate dual-gates, and process Razorpay settlement.
* **Authorization**: `Bearer agent_key_<hash>`
* **Request Payload**:
  ```json
  {
    "merchant_id": "fe9038dc-5d00-4171-a9d6-b292e5dae054",
    "customer_id": "cust_99a80b7c",
    "prompt": "Buy boAt Rockerz 450 Wireless Headphones under ₹2,500"
  }
  ```
* **Response Payload (200 OK)**:
  ```json
  {
    "reply": "Successfully ordered boAt Rockerz 450 Wireless Headphones for ₹2,499.00! Payment captured via Razorpay ID pay_Q9y0nM3nB1x.",
    "policy_decision": "ALLOW",
    "reasoning": "Dual-gated check passed: Customer spend limit valid (₹2499 <= ₹5000), Merchant max_amount valid (₹2499 <= ₹10000).",
    "payment_details": {
      "status": "SETTLED",
      "razorpay_order_id": "order_P8x9kL2mA0z",
      "razorpay_payment_id": "pay_Q9y0nM3nB1x",
      "amount": 2499.00
    }
  }
  ```

---

### Catalog & Shopify Sync Endpoints

#### 2. `GET /catalog/agent-schema`
* **Description**: Returns a structured Schema.org / JSON-LD product catalog feed for external AI agents.
* **Query Parameters**: `merchant_id` (UUID, required)
* **Response Payload (200 OK)**:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "boAt Lifestyle Agent-Readable Catalog",
    "numberOfItems": 4,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "Product",
          "name": "boAt Rockerz 450 Headphones",
          "offers": {
            "@type": "Offer",
            "price": "2499.00",
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock"
          }
        }
      }
    ]
  }
  ```

#### 3. `POST /catalog/bulk-import`
* **Description**: Bulk import catalog items for a merchant via JSON array or parsed CSV.
* **Query Parameters**: `merchant_id` (UUID, required)
* **Request Payload**:
  ```json
  [
    { "name": "boAt Wave Call Smartwatch", "price": 1799.0, "stock": 40, "category": "Smartwatches" },
    { "name": "boAt Airdopes 141", "price": 1299.0, "stock": 60, "category": "Earbuds" }
  ]
  ```

#### 4. `POST /catalog/shopify-sync`
* **Description**: Automatically fetches and syncs live products, prices, variants, and inventory from a Shopify store URL.
* **Query Parameters**: `merchant_id` (UUID, required), `store_url` (string, required), `access_token` (string, optional)
* **Response Payload (201 Created)**: Returns list of imported `CatalogItem` records.

---

### Merchant Agent Key & Webhook Endpoints

#### 5. `POST /merchants/agents`
* **Description**: Issues a new API key for an external AI agent with defined scopes (`read_catalog`, `propose_order`).
* **Header**: `Authorization: Bearer <merchant_jwt>`
* **Request Payload**:
  ```json
  {
    "agent_name": "Procurement Agent Alpha",
    "scopes": ["read_catalog", "propose_order"]
  }
  ```

#### 6. `DELETE /merchants/agents/{agent_id}`
* **Description**: Revokes an issued agent key immediately, blocking all subsequent API calls.

#### 7. `POST /merchants/agents/{agent_id}/rotate`
* **Description**: Rotates the secret string of an active agent key.

#### 8. `POST /webhooks/test`
* **Description**: Triggers an instant test webhook payload signed with HMAC SHA-256 to the merchant's configured endpoint.

---

### Audit & Customer Endpoints

#### 9. `GET /audit/events`
* **Description**: Queries chronological multi-actor audit events.
* **Query Parameters**: `merchant_id`, `actor_type`, `action`, `sort_order` (`asc`/`desc`), `skip`, `limit`.

#### 10. `POST /customer/authorizations`
* **Description**: Sets or updates tokenized payment details and spend caps for a consumer.

#### 11. `GET /health`
* **Description**: Public health check returning backend connection status, database health, and server timestamp.

---

## 6. Technology Stack

### Frontend Architecture
* **Framework**: Next.js 16.3.3 (App Router), React 19.2.8, TypeScript
* **Styling & Aesthetics**: Vanilla CSS + Tailwind CSS, High-Contrast Slate Dark Theme (`#090d16` / `#0d121f`), Zero oversaturated neon colors.
* **Components**: Custom Bento Protocol Inspector, Command Palette Modal (`⌘K`), IntersectionObserver `ScrollReveal`, Interactive FAQ Accordion, Recharts Analytics.
* **Icons**: Lucide React (`lucide-react@1.37.0`)

### Backend Architecture
* **Framework**: FastAPI (Python 3.11+), Pydantic v2, Uvicorn
* **Database & ORM**: PostgreSQL 16, SQLAlchemy 2.0 ORM, Alembic migrations
* **LLM Policy Engine**: Groq Llama 3.3 70B (`groq` SDK)
* **Payment Gateway**: Razorpay Python SDK (Orders API, Payments API, HMAC SHA-256 Signature Verification)
* **Rate Limiting & Caching**: Redis 7 (Sliding Window Velocity Limiter)
* **HTTP Client**: HTTPX (Async & Sync Shopify Storefront crawler)

---

## 7. Local Setup & Quickstart Guide

### Prerequisites
* Python 3.10+
* Node.js 18+
* PostgreSQL 16 (or Docker Desktop for local postgres container)

### Step 1: Environment Configuration
Create a `.env` file in the root directory:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=agentpay
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentpay

GROQ_API_KEY=your_groq_api_key_here
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

JWT_SECRET=super_secret_jwt_key_agentpay
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 2: Launch Backend API Server
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
* Backend interactive OpenAPI documentation available at: `http://localhost:8000/docs`
* Health diagnostic route available at: `http://localhost:8000/health`

### Step 3: Launch Frontend Web Application
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
* Access the Agentpay application at: `http://localhost:3000`

---

## 8. License & Acknowledgments

Built for the **Razorpay AI Buildathon 2026** under **Track 01 — AI Growth & Agentic Commerce**.  
Designed with ultra-readable high-contrast typography, deterministic payment gating, and zero-trust security.
