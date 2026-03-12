"""Quizik API — Shared FastAPI dependencies."""

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.database import get_db as _get_db


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    async for session in _get_db():
        yield session


async def get_current_user(db: AsyncSession = Depends(get_db)):  # noqa: ARG001, B008
    """Dependency stub — will be implemented with JWT decoding in Phase 2."""
    raise NotImplementedError("Auth not yet implemented")
