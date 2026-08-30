from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, merchant, catalog, policy, payment, audit, agent, auth, webhook, customer, customer_chat

from app.core.database import Base, engine
import app.models  # Ensure all models are registered in Base.metadata
from sqlalchemy import text

try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
        conn.commit()
except Exception as e:
    print(f"Database initialization info: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agent-ready merchant commerce platform — Razorpay AI Buildathon",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(merchant.router)
app.include_router(catalog.router)
app.include_router(policy.router)
app.include_router(payment.router)
app.include_router(audit.router)
app.include_router(agent.router)
app.include_router(webhook.router)
app.include_router(customer.router)
app.include_router(customer_chat.router)

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("agentpay")

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=1.0,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    
    logger.error(f"Unhandled Application Exception: {str(exc)}", exc_info=True)
    if settings.SENTRY_DSN:
        sentry_sdk.capture_exception(exc)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal Application Error - Exception captured by Observability Engine"}
    )

@app.get("/")
def root():
    return {
        "message": "Welcome to Agentpay API",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/debug-sentry")
def trigger_sentry_error():
    """Explicit endpoint to trigger and verify real Sentry error tracking."""
    try:
        raise ValueError("Triggered simulated application error for Sentry observability audit")
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        logger.error(f"Sentry Exception Captured: {str(exc)}")
        return {
            "status": "error_captured",
            "error_type": type(exc).__name__,
            "message": str(exc),
            "sentry_captured": True
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
