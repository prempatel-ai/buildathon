# Agentpay — Agent-Ready Merchant Commerce Platform

Submission for **Razorpay AI Buildathon** (Track 01: AI Growth & Agentic Commerce).

## Project Overview

Agentpay is a self-serve infrastructure layer that allows merchants to become instantly discoverable and transactable by AI buyer agents using Razorpay test-mode APIs under a bounded, explainable consent model.

Core Design Rule: **The LLM never touches Razorpay directly. It proposes tool calls, a policy engine gates them, and only approved proposals execute.**

## Repository Structure

```
/backend
  /app
    /agents        # LangGraph graph definition & reasoning nodes
    /policy        # Rule engine & limits evaluation
    /services      # Catalog, payment, audit services
    /models        # SQLAlchemy database models (6 tables)
    /schemas       # Pydantic request/response & tool schemas
    /routers       # FastAPI HTTP route handlers
    /core          # Config, database sessions, auth
  /alembic         # Database migration scripts
  main.py          # FastAPI application entrypoint
/frontend          # Next.js 14 App Router dashboard
/infra             # Docker Compose infrastructure (Postgres, Redis)
```

## Getting Started

### 1. Infrastructure (Postgres + Redis)

Navigate to `/infra` and start the Docker containers:

```bash
cd infra
docker-compose up -d
```

This starts PostgreSQL on port `5432` and Redis on port `6379`.

### 2. Backend Setup

From `/backend`:

```bash
cd backend
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn main:app --reload
```

The health check endpoint is available at `http://localhost:8000/health`.

### 3. Frontend Setup

From `/frontend`:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.
