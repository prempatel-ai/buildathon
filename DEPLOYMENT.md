# Agentpay — Production Deployment Guide

This repository is configured for one-click deployment:
- **Backend**: Deployed on **Render** (FastAPI + Uvicorn + PostgreSQL + Redis)
- **Frontend**: Deployed on **Vercel** (Next.js 16 + HeroUI + Tailwind CSS)

---

## 1. Backend Deployment (Render)

### Steps:
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository (`prempatel-ai/buildathon`).
4. Select `render.yaml` or manually create a **Web Service**:
   - **Name**: `agentpay-backend`
   - **Environment**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Required Environment Variables on Render:
| Variable Key | Description / Value Example |
| :--- | :--- |
| `PROJECT_NAME` | `Agentpay Protocol` |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | `postgresql://user:password@render-pg-host/agentpay_db` |
| `REDIS_URL` | `redis://default:password@render-redis-host:6379` |
| `GROQ_API_KEY` | `gsk_...` (Groq Llama 3.3 70B Intent Parsing) |
| `RAZORPAY_KEY_ID` | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | `secret_...` |

Once deployed, copy your Render web service URL (e.g., `https://agentpay-backend.onrender.com`).

---

## 2. Frontend Deployment (Vercel)

### Steps:
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository (`prempatel-ai/buildathon`).
4. Configure Project Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`

### Required Environment Variables on Vercel:
| Variable Key | Description / Value Example |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://agentpay-backend.onrender.com` (Your Render Backend URL) |

5. Click **Deploy**. Vercel will build and assign your production domain (e.g. `https://agentpay.vercel.app`).

---

## 3. End-to-End Verification

After deployment, run a health check against your live production endpoints:

```bash
# Backend Health Check
curl -X GET https://agentpay-backend.onrender.com/health

# Output:
# {"status":"ok","app":"Agentpay Protocol","version":"1.0.0"}
```
