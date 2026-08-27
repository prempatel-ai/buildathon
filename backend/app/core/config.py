import os
from pydantic_settings import BaseSettings, SettingsConfigDict

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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
