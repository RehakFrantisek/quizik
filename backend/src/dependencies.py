"""Quizik API — Shared FastAPI dependencies."""

from collections.abc import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db as _get_db


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    async for session in _get_db():
        yield session


from src.models.user import User
from sqlalchemy import select

async def get_current_user(db: AsyncSession = Depends(get_db)):
    """Mock auth: return a dummy admin user, creating it if necessary."""
    dummy_email = "admin@quizik.local"
    stmt = select(User).where(User.email == dummy_email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            email=dummy_email,
            display_name="Admin",
            password_hash="dummy_hash"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return user
