"""Quizik API — Sessions router (teacher-facing session management)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db
from src.models.user import User
from src.schemas.session import (
    AttemptDetail,
    AttemptSummary,
    ScoreOverrideRequest,
    SessionCreate,
    SessionOut,
    SessionUpdate,
)
from src.services import session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ── Session CRUD ──────────────────────────────────────────────────────────────

@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new quiz session from an owned quiz template."""
    session = await session_service.create_session(db, current_user, body)
    return _enrich(session, attempt_count=0)


@router.get("", response_model=list[SessionOut])
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all sessions owned by the current user."""
    sessions = await session_service.list_sessions(db, current_user.id)
    if not sessions:
        return []
    counts = await session_service.count_attempts_by_session(db, [s.id for s in sessions])
    return [_enrich(s, counts.get(s.id, 0)) for s in sessions]


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific session owned by the current user."""
    from src.exceptions import ForbiddenException

    session = await session_service.get_session(db, session_id)
    if session.owner_id != current_user.id:
        raise ForbiddenException()
    counts = await session_service.count_attempts_by_session(db, [session.id])
    return _enrich(session, counts.get(session.id, 0))


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a session and all its attempts."""
    await session_service.delete_session(db, session_id, current_user.id)


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: uuid.UUID,
    body: SessionUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update session settings (title, status, time window, etc.)."""
    session = await session_service.update_session(db, session_id, current_user.id, body)
    counts = await session_service.count_attempts_by_session(db, [session.id])
    return _enrich(session, counts.get(session.id, 0))


# ── Attempt management ────────────────────────────────────────────────────────

@router.get("/{session_id}/attempts", response_model=list[AttemptSummary])
async def list_attempts(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all attempts for a session (teacher view)."""
    return await session_service.list_attempts(db, session_id, current_user.id)


@router.get("/{session_id}/attempts/{attempt_id}", response_model=AttemptDetail)
async def get_attempt(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get full attempt detail including answers (teacher view)."""
    return await session_service.get_attempt_detail(db, session_id, attempt_id, current_user.id)


@router.post(
    "/{session_id}/attempts/{attempt_id}/hide",
    response_model=AttemptSummary,
)
async def hide_from_leaderboard(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Soft-hide an attempt from the leaderboard (reversible)."""
    return await session_service.hide_attempt_from_leaderboard(
        db, session_id, attempt_id, current_user.id
    )


@router.post(
    "/{session_id}/attempts/{attempt_id}/unhide",
    response_model=AttemptSummary,
)
async def unhide_from_leaderboard(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Restore a hidden attempt to the leaderboard."""
    return await session_service.unhide_attempt_from_leaderboard(
        db, session_id, attempt_id, current_user.id
    )


@router.patch(
    "/{session_id}/attempts/{attempt_id}/answers/{answer_id}/score",
    response_model=dict,
)
async def override_answer_score(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    answer_id: uuid.UUID,
    body: ScoreOverrideRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Manually override the score for a specific answer."""
    answer = await session_service.override_answer_score(
        db, session_id, attempt_id, answer_id, current_user, body
    )
    return {
        "answer_id": str(answer.id),
        "points_override": answer.points_override,
        "override_reason": answer.override_reason,
        "override_at": answer.override_at.isoformat() if answer.override_at else None,
    }


@router.get("/{session_id}/leaderboard", response_model=list[AttemptSummary])
async def get_leaderboard(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Public leaderboard for a session (sorted by score). Requires leaderboard_enabled."""
    session = await session_service.get_session(db, session_id)
    if not session.leaderboard_enabled:
        from src.exceptions import ForbiddenException
        raise ForbiddenException("Leaderboard is not enabled for this session")
    return await session_service.get_leaderboard(db, session_id)


@router.delete("/{session_id}/attempts/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attempt(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a specific attempt (teacher action)."""
    await session_service.delete_attempt(db, session_id, attempt_id, current_user.id)


@router.get("/{session_id}/analytics")
async def get_session_analytics(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get per-question answer statistics for a session (teacher view)."""
    return await session_service.get_session_analytics(db, session_id, current_user.id)


# ── Helper ────────────────────────────────────────────────────────────────────

def _enrich(session, attempt_count: int):
    """Return SessionOut with attempt_count injected."""
    from src.schemas.session import SessionOut

    data = SessionOut.model_validate(session)
    data.attempt_count = attempt_count
    # Populate quiz_title from relationship if loaded
    try:
        data.quiz_title = session.quiz.title if session.quiz else None
    except Exception:
        data.quiz_title = None
    return data
