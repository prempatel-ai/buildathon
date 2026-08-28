# Live Deployment Guide — Render (Backend) & Vercel (Frontend)

Follow these step-by-step instructions to deploy Agentpay live to Render.com and Vercel.

---

## 1. Deploy Backend + PostgreSQL + Redis on Render

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub / GitLab repository (`prempatel-ai/buildathon`).
4. Render will automatically detect [`render.yaml`](file:///d:/last/render.yaml) and create 3 services:
   - **PostgreSQL Database** (`agentpay-db`)
   - **Redis Instance** (`agentpay-redis`)
   - **FastAPI Web Service** (`agentpay-backend`)
5. Set the required Environment Variables in Render Web Service settings:
   - `GROQ_API_KEY`: Your Groq API key (`gsk_...`)
   - `RAZORPAY_KEY_ID`: Your Razorpay Test Key ID (`rzp_test_...`)
   - `RAZORPAY_KEY_SECRET`: Your Razorpay Test Secret (`...`)
6. Click **Apply**.
7. Once deployment finishes, Render will provide your public backend URL, e.g.:
   `https://agentpay-backend.onrender.com`

### Verify Public Health Check Endpoint:
```bash
curl https://agentpay-backend.onrender.com/health
```
**Expected Response**:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "database": "connected",
  "redis": "connected"
}
```

---

## 2. Deploy Frontend on Vercel

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your repository (`prempatel-ai/buildathon`) and set the Root Directory to `frontend`.
4. Under **Environment Variables**, add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://agentpay-backend.onrender.com` (Your Render backend URL)
5. Click **Deploy**.
6. Vercel will build and assign your public frontend URL, e.g.:
   `https://agentpay-frontend.vercel.app`

---

## 3. Run Live End-to-End Verification

Execute the live verification script against deployed URLs:

```bash
python backend/deploy_live_verification.py --backend-url https://agentpay-backend.onrender.com
```

This script runs the full demo flow against your live infrastructure over the public internet:
1. Onboard Merchant (`POST /merchants/seed`)
2. AI Agent Catalog Discovery (`POST /agent/chat` -> `get_catalog`)
3. Propose Purchase Order (`POST /agent/chat` -> `propose_order`)
4. Policy Engine Live Gating (ALLOW / DENY / NEEDS_APPROVAL)
5. Execute Razorpay Test Mode Payment Order (`POST /payments/create-order`)
6. Deliberate Over-Limit Failure (₹45,000 against ₹1,000 limit -> Blocked cleanly with 0 transaction rows created)
