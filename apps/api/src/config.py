"""Quizik API — Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──
    database_url: str = "postgresql+asyncpg://quizik:quizik_dev_password@postgres:5432/quizik"

    # ── Redis ──
    redis_url: str = "redis://redis:6379/0"

    # ── Auth ──
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── CORS ──
    frontend_url: str = "http://localhost:3000"

    # ── Email ──
    smtp_host: str = "mailhog"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@quizik.local"

    # ── App ──
    environment: str = "development"
    debug: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
