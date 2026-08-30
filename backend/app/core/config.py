import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve absolute paths to backend/.env and root/.env
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

ENV_FILES = [
    str(BACKEND_DIR / ".env"),
    str(ROOT_DIR / ".env"),
    ".env"
]

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agentpay API"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "development_secret_key_change_in_production"

    # Database & Redis
    DATABASE_URL: str = "postgresql://agentpay:agentpay_password@localhost:5432/agentpay_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # External Integrations
    GROQ_API_KEY: str = "gsk_placeholder_groq_api_key"
    RAZORPAY_KEY_ID: str = "rzp_test_placeholder_key_id"
    RAZORPAY_KEY_SECRET: str = "placeholder_key_secret"

    # Observability & Monitoring
    SENTRY_DSN: str | None = None

    @property
    def sync_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url

    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

