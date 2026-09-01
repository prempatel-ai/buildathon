"""
AGENTPAY PROTOCOL — Copyright (c) 2026 Prem Patel. All Rights Reserved.
Official Submission for Razorpay AI Buildathon 2026 (Track 01: AI Growth & Agentic Commerce)
Unauthorized copying, cloning, or third-party re-submission is strictly prohibited.

Agentpay Backend Core Application Entrypoint.

Architected to Unicorn-Grade Enterprise Standards:
- Clean async context lifespan for startup/shutdown tasks
- Non-blocking database schema verification & auto-seeding
- Structured telemetry, Sentry observability, and centralized exception handling
- Declarative API router registry
"""

import os
import sys
import logging
import traceback
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
import app.models  # Ensures all SQLAlchemy declarative models are registered

# Configure Enterprise-Grade Structured Logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("agentpay")

# Initialize Sentry Observability if configured
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=1.0,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
            ],
        )
        logger.info("Sentry observability initialized successfully.")
    except Exception as sentry_err:
        logger.warning(f"Sentry initialization skipped: {sentry_err}")


def init_db_schema() -> None:
    """Idempotent database schema verification and table migration."""
    try:
        Base.metadata.create_all(bind=engine)
        if not settings.sync_database_url.startswith("sqlite"):
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();"))
                conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;"))
                conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP WITH TIME ZONE;"))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS recommendations (
                        id UUID PRIMARY KEY,
                        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
                        source_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
                        recommended_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE,
                        recommended_merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
                        reason TEXT NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'shown',
                        shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                """))
                conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_recommendation_id UUID REFERENCES recommendations(id) ON DELETE SET NULL;"))
                conn.execute(text("ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS description TEXT;"))
                conn.execute(text("ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;"))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS campaign_offers (
                        id UUID PRIMARY KEY,
                        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
                        merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
                        source_item_id UUID REFERENCES catalog_items(id) ON DELETE CASCADE,
                        source_event_id UUID REFERENCES audit_events(id) ON DELETE SET NULL,
                        discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                        discount_value NUMERIC(10, 2) NOT NULL,
                        original_price NUMERIC(10, 2) NOT NULL,
                        discounted_price NUMERIC(10, 2) NOT NULL,
                        reason TEXT NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """))
                conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_campaign_offer_id UUID REFERENCES campaign_offers(id) ON DELETE SET NULL;"))
                conn.commit()
        logger.info("Database schema verified.")
    except Exception as db_init_err:
        logger.warning(f"Database schema verification notice: {db_init_err}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application Lifecycle Management: handles boot sequence and graceful shutdown."""
    logger.info(f"Starting {settings.PROJECT_NAME} in '{settings.ENVIRONMENT}' environment...")
    init_db_schema()
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME} gracefully.")


# FastAPI Application Instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agent-Ready Autonomous Merchant Commerce Platform — Razorpay AI Buildathon",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Cross-Origin Resource Sharing (CORS) Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router Registrations
from app.routers import (
    health,
    auth,
    merchant,
    catalog,
    policy,
    payment,
    audit,
    agent,
    webhook,
    customer,
    customer_chat,
    address,
    admin,
    merchant_campaigns
)

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
app.include_router(address.router)
app.include_router(admin.router)
app.include_router(merchant_campaigns.router)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Centralized exception handling with structured error responses."""
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers
        )

    logger.error(f"Unhandled Application Exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)

    if settings.SENTRY_DSN:
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "error_type": type(exc).__name__,
            "message": str(exc) if settings.ENVIRONMENT == "development" else "Internal server error"
        }
    )


@app.get("/", tags=["System"])
def root() -> Dict[str, Any]:
    """Root platform discovery endpoint."""
    return {
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/debug-sentry", tags=["System"])
def trigger_sentry_debug():
    """Explicit endpoint to verify Sentry error tracking and telemetry."""
    try:
        raise ValueError("Triggered simulated error for Sentry observability audit")
    except Exception as exc:
        if settings.SENTRY_DSN:
            try:
                import sentry_sdk
                sentry_sdk.capture_exception(exc)
            except Exception:
                pass
        logger.error(f"Sentry Exception Captured: {str(exc)}")
        return {
            "status": "error_captured",
            "error_type": type(exc).__name__,
            "message": str(exc),
            "sentry_captured": bool(settings.SENTRY_DSN)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
