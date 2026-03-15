"""Quizik API — Shared FastAPI dependencies."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db as _get_db
from src.exceptions import UnauthorizedException
from src.models.user import User


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    async for session in _get_db():
        yield session


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate JWT Bearer token, return the authenticated user."""
    from src.services import auth_service

    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Authentication required. Provide: Authorization: Bearer <token>")

    token = authorization[7:]
    user_id = auth_service.decode_access_token(token)

    user = await auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")

    return user


async def get_current_user_optional(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user but returns None instead of raising for unauthenticated requests.

    Used on public endpoints that can also benefit from user context (e.g. play routes).
    """
    if not authorization:
        return None
    try:
        return await get_current_user(authorization=authorization, db=db)
    except UnauthorizedException:
        return None
