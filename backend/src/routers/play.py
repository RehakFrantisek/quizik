"""Quizik API — Public play router (participant-facing, no auth required)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db
from src.services import play_service

router = APIRouter(prefix="/play", tags=["play"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class StartAttemptRequest(BaseModel):
    participant_name: str = Field(min_length=1, max_length=100)
    device_token: str | None = Field(default=None, max_length=64)


class AnswerPayload(BaseModel):
    question_id: uuid.UUID
    response: str | list | dict | None = None
    time_spent_sec: int | None = None


class SubmitAttemptRequest(BaseModel):
    answers: list[AnswerPayload]
    minigame_score: int = Field(default=0, ge=0)  # raw tap total from minigames


class TelemetryPayload(BaseModel):
    events: list[dict]  # [{event_type, payload, client_ts}, ...]


class CorrectAnswerRequest(BaseModel):
    question_id: uuid.UUID


class SaveProgressRequest(BaseModel):
    answers: dict  # {question_id: response}  — max ~500 entries expected


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/{session_slug}")
async def get_quiz_for_play(
    session_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return quiz metadata and questions for the public play view.

    No auth required. is_correct is stripped from options.
    """
    return await play_service.get_public_session_quiz(db, session_slug)


@router.post("/{session_slug}/start")
async def start_attempt(
    session_slug: str,
    body: StartAttemptRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Start a new attempt for a quiz session."""
    attempt = await play_service.start_attempt(db, session_slug, body.participant_name, body.device_token)
    return {"attempt_id": str(attempt.id), "started_at": attempt.started_at.isoformat()}


@router.post("/{session_slug}/attempts/{attempt_id}/submit")
async def submit_attempt(
    session_slug: str,
    attempt_id: uuid.UUID,
    body: SubmitAttemptRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Submit answers and complete the attempt. Returns score + evaluation."""
    answers_payload = [
        {
            "question_id": str(a.question_id),
            "response": a.response,
            "time_spent_sec": a.time_spent_sec,
        }
        for a in body.answers
    ]
    result = await play_service.submit_attempt(db, session_slug, attempt_id, answers_payload, body.minigame_score)
    return {
        "attempt_id": str(result["attempt"].id),
        "status": result["attempt"].status,
        "score": result["attempt"].score,
        "max_score": result["attempt"].max_score,
        "percentage": result["attempt"].percentage,
        "minigame_score": result["attempt"].minigame_score,
        "completed_at": result["attempt"].completed_at.isoformat() if result["attempt"].completed_at else None,
        "answer_results": result["answer_results"],
    }


@router.patch("/{session_slug}/attempts/{attempt_id}/correct")
async def correct_answer(
    session_slug: str,
    attempt_id: uuid.UUID,
    body: CorrectAnswerRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """End-correction bonus: mark one wrong answer as correct post-submit."""
    return await play_service.correct_answer(db, session_slug, attempt_id, body.question_id)


@router.get("/{session_slug}/questions/{question_id}/eliminate")
async def get_eliminate_options(
    session_slug: str,
    question_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """50/50 bonus: return 2 wrong option IDs to hide (server-verified)."""
    return await play_service.get_eliminate_options(db, session_slug, question_id)


@router.patch("/{session_slug}/attempts/{attempt_id}/progress", status_code=200)
async def save_progress(
    session_slug: str,
    attempt_id: uuid.UUID,
    body: SaveProgressRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Save partial answer progress for an in-progress attempt (best-effort)."""
    await play_service.save_progress(db, session_slug, attempt_id, body.answers)
    return {"ok": True}


@router.post("/{session_slug}/attempts/{attempt_id}/telemetry", status_code=201)
async def ingest_telemetry(
    session_slug: str,
    attempt_id: uuid.UUID,
    body: TelemetryPayload,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Ingest anti-cheat telemetry events from the client."""
    await play_service.ingest_telemetry(db, session_slug, attempt_id, body.events)
    return {"ok": True}


@router.get("/{session_slug}/leaderboard")
async def get_leaderboard(
    session_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Public leaderboard for a session (sorted by score desc)."""
    from src.services.session_service import get_session_by_slug, get_leaderboard

    session = await get_session_by_slug(db, session_slug)
    if not session.leaderboard_enabled:
        return {"leaderboard_enabled": False, "entries": []}

    attempts = await get_leaderboard(db, session.id)
    entries = [
        {
            "rank": i + 1,
            "participant_name": a.participant_name,
            "score": a.score,
            "max_score": a.max_score,
            "percentage": a.percentage,
            "time_spent_sec": a.time_spent_sec,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        }
        for i, a in enumerate(attempts)
    ]
    return {"leaderboard_enabled": True, "entries": entries}
