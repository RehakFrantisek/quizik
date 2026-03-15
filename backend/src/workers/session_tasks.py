"""Quizik API — Celery tasks for scheduled session management."""

import asyncio
from datetime import datetime

import structlog
from sqlalchemy import select, update

from src.database import async_session
from src.models.quiz_session import QuizSession
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


async def _auto_manage_sessions_async() -> None:
    """
    Open sessions whose starts_at has passed (status='scheduled' → 'active').
    Close sessions whose ends_at has passed (status='active' → 'closed').
    """
    now = datetime.utcnow()
    async with async_session() as session:
        # Auto-open: scheduled sessions whose start time has passed
        opened = await session.execute(
            update(QuizSession)
            .where(
                QuizSession.status == "scheduled",
                QuizSession.starts_at <= now,
            )
            .values(status="active")
            .returning(QuizSession.id)
        )
        opened_ids = opened.fetchall()

        # Auto-close: active sessions whose end time has passed
        closed = await session.execute(
            update(QuizSession)
            .where(
                QuizSession.status == "active",
                QuizSession.ends_at.is_not(None),
                QuizSession.ends_at <= now,
            )
            .values(status="closed")
            .returning(QuizSession.id)
        )
        closed_ids = closed.fetchall()

        await session.commit()

    if opened_ids:
        logger.info("sessions_auto_opened", count=len(opened_ids))
    if closed_ids:
        logger.info("sessions_auto_closed", count=len(closed_ids))


@celery_app.task(name="auto_manage_sessions")
def auto_manage_sessions() -> None:
    """Celery periodic task: open/close sessions based on time windows."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.run_until_complete(_auto_manage_sessions_async())
