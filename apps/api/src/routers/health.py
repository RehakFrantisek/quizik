"""Quizik API — Health check endpoints."""

from fastapi import APIRouter
from redis.asyncio import Redis
from sqlalchemy import text

from apps.api.src.config import settings
from apps.api.src.database import engine

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health():
    """Basic liveness check."""
    return {"status": "ok"}


@router.get("/db")
async def health_db():
    """PostgreSQL connectivity check."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "service": "postgresql"}
    except Exception as e:
        return {"status": "error", "service": "postgresql", "detail": str(e)}


@router.get("/redis")
async def health_redis():
    """Redis connectivity check."""
    try:
        client = Redis.from_url(settings.redis_url)
        await client.ping()
        await client.aclose()
        return {"status": "ok", "service": "redis"}
    except Exception as e:
        return {"status": "error", "service": "redis", "detail": str(e)}
