from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import health, merchant, catalog, policy

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
app.include_router(merchant.router)
app.include_router(catalog.router)
app.include_router(policy.router)

@app.get("/")
def root():
    return {
        "message": "Welcome to Agentpay API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
