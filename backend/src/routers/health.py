"""Quizik API — Health check endpoints."""

from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from src.config import settings
from src.database import engine, get_db
from src.models.quiz import Quiz
from src.models.user import User

router = APIRouter(prefix="/health", tags=["health"])


@router.api_route("/", methods=["GET", "HEAD"])
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


@router.get("/stats")
async def public_stats(db: AsyncSession = Depends(get_db)):
    """Public platform stats shown on the landing page."""
    quiz_count = (await db.execute(select(func.count()).select_from(Quiz))).scalar_one()
    user_count = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    return {"quiz_count": quiz_count, "user_count": user_count}
