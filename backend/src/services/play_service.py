"""Quizik API — Public play service (start attempt, submit answers)."""

import random
import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.exceptions import NotFoundException, ValidationException
from src.models.answer import Answer
from src.models.attempt import Attempt
from src.models.question import Question
from src.models.quiz import Quiz
from src.models.quiz_session import QuizSession
from src.models.telemetry import TelemetryEvent
from src.services.evaluation_service import evaluate_answer
from src.services.session_service import get_session_by_slug


# ── Public quiz / session info ────────────────────────────────────────────────

async def get_public_session_quiz(db: AsyncSession, session_slug: str) -> dict:
    """Return safe quiz+session data for the public play view."""
    session = await get_session_by_slug(db, session_slug)

    if session.status != "active":
        raise ValidationException("This quiz session is not currently active")

    now = datetime.utcnow()
    if session.starts_at and now < session.starts_at.replace(tzinfo=None):
        raise ValidationException("This quiz session has not started yet")
    if session.ends_at and now > session.ends_at.replace(tzinfo=None):
        raise ValidationException("This quiz session has ended")

    stmt = (
        select(Quiz)
        .where(Quiz.id == session.quiz_id)
        .options(selectinload(Quiz.questions))
    )
    quiz = (await db.execute(stmt)).scalar_one_or_none()
    if not quiz:
        raise NotFoundException(resource="Quiz")

    display_title = session.title or quiz.title

    # Build question list, applying session-level question count limit
    questions = [_public_question(q) for q in quiz.questions]
    session_q_count = getattr(session, "question_count", 0) or 0
    if 0 < session_q_count < len(questions):
        questions = random.sample(questions, session_q_count)

    # Session-level shuffle overrides (None = use quiz setting)
    effective_shuffle_questions = getattr(session, "shuffle_questions", None)
    if effective_shuffle_questions is None:
        effective_shuffle_questions = quiz.settings.get("shuffle_questions", True)
    effective_shuffle_options = getattr(session, "shuffle_options", None)
    if effective_shuffle_options is None:
        effective_shuffle_options = quiz.settings.get("shuffle_options", False)

    return {
        "session_id": str(session.id),
        "session_slug": session.session_slug,
        "title": display_title,
        "description": quiz.description,
        "leaderboard_enabled": session.leaderboard_enabled,
        "play_mode": getattr(session, "play_mode", "quiz"),
        "allow_repeat": session.allow_repeat,
        "max_repeats": getattr(session, "max_repeats", 0) or 0,
        "show_correct_answer": session.show_correct_answer,
        "gamification_enabled": session.gamification_enabled,
        "minigame_type": session.minigame_type,
        "minigame_config": getattr(session, "minigame_config", None),
        "minigame_trigger_mode": session.minigame_trigger_mode,
        "minigame_trigger_n": session.minigame_trigger_n,
        "time_limit_sec": quiz.settings.get("time_limit_sec"),
        "shuffle_questions": effective_shuffle_questions,
        "shuffle_options": effective_shuffle_options,
        "question_count": len(questions),
        "anticheat_enabled": getattr(session, "anticheat_enabled", False),
        "anticheat_tab_switch": getattr(session, "anticheat_tab_switch", False),
        "anticheat_fast_answer": getattr(session, "anticheat_fast_answer", False),
        "bonuses_enabled": getattr(session, "bonuses_enabled", False),
        "bonus_eliminate": getattr(session, "bonus_eliminate", False),
        "bonus_second_chance": getattr(session, "bonus_second_chance", False),
        "bonus_end_correction": getattr(session, "bonus_end_correction", False),
        "bonus_unlock_mode": getattr(session, "bonus_unlock_mode", "immediate"),
        "bonus_unlock_x": getattr(session, "bonus_unlock_x", 3),
        "questions": questions,
    }


def _public_question(q: Question) -> dict:
    """Strip is_correct from public-facing question data."""
    return {
        "id": str(q.id),
        "type": q.type,
        "body": q.body,
        "points": q.points,
        "image_url": q.image_url,
        "options": [
            {"id": opt["id"], "text": opt["text"]}
            for opt in q.options
        ],
    }


# ── Start attempt ─────────────────────────────────────────────────────────────

async def start_attempt(
    db: AsyncSession, session_slug: str, participant_name: str, device_token: str | None = None
) -> Attempt:
    session = await get_session_by_slug(db, session_slug)

    if session.status != "active":
        raise ValidationException("This quiz session is not currently active")

    # Repeat restriction: check max_repeats (overrides allow_repeat if > 0)
    max_repeats = getattr(session, "max_repeats", 0) or 0
    if device_token:
        if max_repeats > 0:
            count_stmt = select(func.count()).where(
                Attempt.session_id == session.id,
                Attempt.device_token == device_token,
                Attempt.status == "completed",
            )
            completed_count = (await db.execute(count_stmt)).scalar() or 0
            if completed_count >= max_repeats:
                raise ValidationException("ALREADY_ATTEMPTED")
        elif not session.allow_repeat:
            # Legacy: allow_repeat=False means one attempt
            existing_stmt = select(Attempt).where(
                Attempt.session_id == session.id,
                Attempt.device_token == device_token,
                Attempt.status == "completed",
            )
            existing = (await db.execute(existing_stmt)).scalar_one_or_none()
            if existing:
                raise ValidationException("ALREADY_ATTEMPTED")

    attempt = Attempt(
        quiz_id=session.quiz_id,
        session_id=session.id,
        participant_name=participant_name.strip(),
        device_token=device_token,
        status="in_progress",
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


# ── Submit attempt ────────────────────────────────────────────────────────────

async def submit_attempt(
    db: AsyncSession,
    session_slug: str,
    attempt_id: uuid.UUID,
    answers_payload: list[dict],
    minigame_score: int = 0,
) -> dict:
    """Grade and complete an attempt.

    answers_payload: [{"question_id": str, "response": ..., "time_spent_sec": int}]
    Returns: {"attempt": Attempt, "answer_results": [...]}
    """
    session = await get_session_by_slug(db, session_slug)

    stmt = (
        select(Attempt)
        .where(Attempt.id == attempt_id, Attempt.session_id == session.id)
    )
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if not attempt:
        raise NotFoundException(resource="Attempt")
    if attempt.status != "in_progress":
        raise ValidationException("Attempt already submitted")

    # Load questions
    q_stmt = select(Question).where(Question.quiz_id == session.quiz_id)
    questions = {str(q.id): q for q in (await db.execute(q_stmt)).scalars().all()}

    total_score = 0
    max_score = sum(q.points for q in questions.values())
    time_total = 0
    answer_results = []

    play_mode = getattr(session, "play_mode", "quiz")
    if play_mode in {"memory_pairs", "speed_match"}:
        for ans_data in answers_payload:
            time_spent = ans_data.get("time_spent_sec")
            if isinstance(time_spent, int):
                time_total += time_spent
        final_score = max(0, min(int(minigame_score), 100))
        attempt.status = "completed"
        attempt.score = final_score
        attempt.max_score = 100
        attempt.minigame_score = min(minigame_score, 32767)
        attempt.percentage = float(final_score)
        attempt.time_spent_sec = min(time_total, 32767) if time_total > 0 else None
        attempt.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(attempt)
        return {"attempt": attempt, "answer_results": []}

    cfg = getattr(session, "minigame_config", None) or {}
    enabled_minigames = cfg.get("enabled_minigames") if isinstance(cfg, dict) else None
    risk_reward_enabled = isinstance(enabled_minigames, list) and "risk_reward" in enabled_minigames

    for ans_data in answers_payload:
        q_id = str(ans_data.get("question_id", ""))
        question = questions.get(q_id)
        if not question:
            continue  # skip unknown questions

        response = ans_data.get("response")
        time_spent = ans_data.get("time_spent_sec")
        if isinstance(time_spent, int):
            time_total += time_spent

        is_correct, points = evaluate_answer(question, response)
        total_score += points
        risk_bet_raw = ans_data.get("risk_bet")
        risk_bet = int(risk_bet_raw) if isinstance(risk_bet_raw, int) else 0
        if risk_reward_enabled and risk_bet in {5, 10, 20}:
            total_score += risk_bet if is_correct else -risk_bet

        db.add(
            Answer(
                attempt_id=attempt_id,
                question_id=question.id,
                response=response,
                is_correct=is_correct,
                points_awarded=points,
                time_spent_sec=time_spent,
            )
        )

        # Build correct answer info for show_correct_answer feature
        correct_options = [opt for opt in question.options if opt.get("is_correct")]
        correct_texts = [opt["text"] for opt in correct_options]
        correct_ids = [opt["id"] for opt in correct_options]
        answer_results.append({
            "question_id": q_id,
            "is_correct": is_correct,
            "points_awarded": points,
            "correct_option_ids": correct_ids,
            "correct_texts": correct_texts,
        })

    # Add gamification bonus: each 10 taps = 1 bonus point
    gamification_bonus = round(minigame_score / 10)
    final_score = total_score + gamification_bonus

    attempt.status = "completed"
    attempt.score = max(-32768, min(final_score, 32767))
    attempt.max_score = max_score
    attempt.minigame_score = max(-32768, min(minigame_score, 32767))
    attempt.percentage = round(final_score / max_score * 100, 1) if max_score > 0 else 0.0
    attempt.time_spent_sec = min(time_total, 32767)  # SmallInt max
    attempt.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(attempt)
    return {"attempt": attempt, "answer_results": answer_results}


# ── End-correction bonus ──────────────────────────────────────────────────────

async def correct_answer(
    db: AsyncSession,
    session_slug: str,
    attempt_id: uuid.UUID,
    question_id: uuid.UUID,
) -> dict:
    """End-correction bonus: mark one wrong answer as correct and update attempt score.

    Can only be applied to a completed attempt and to an answer that is wrong.
    The frontend enforces single-use; the backend validates the answer is wrong.
    """
    from src.models.answer import Answer

    session = await get_session_by_slug(db, session_slug)

    if not getattr(session, "bonuses_enabled", False) or not getattr(session, "bonus_end_correction", False):
        raise ValidationException("End-correction bonus is not enabled for this session")

    stmt = select(Attempt).where(Attempt.id == attempt_id, Attempt.session_id == session.id)
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if not attempt:
        raise NotFoundException(resource="Attempt")
    if attempt.status != "completed":
        raise ValidationException("Attempt must be completed to apply end-correction")

    ans_stmt = select(Answer).where(
        Answer.attempt_id == attempt_id,
        Answer.question_id == question_id,
    )
    answer = (await db.execute(ans_stmt)).scalar_one_or_none()
    if not answer:
        raise NotFoundException(resource="Answer")
    if answer.is_correct:
        raise ValidationException("Answer is already correct")

    q_stmt = select(Question).where(Question.id == question_id)
    question = (await db.execute(q_stmt)).scalar_one_or_none()
    if not question:
        raise NotFoundException(resource="Question")

    bonus_points = question.points - answer.points_awarded
    answer.is_correct = True
    answer.points_awarded = question.points

    attempt.score = min((attempt.score or 0) + bonus_points, 32767)
    attempt.percentage = (
        round(attempt.score / attempt.max_score * 100, 1) if attempt.max_score else 0.0
    )

    await db.commit()
    await db.refresh(attempt)

    return {
        "question_id": str(question_id),
        "new_score": attempt.score,
        "new_percentage": attempt.percentage,
        "points_gained": bonus_points,
    }


async def get_eliminate_options(
    db: AsyncSession,
    session_slug: str,
    question_id: uuid.UUID,
) -> dict:
    """Return 2 wrong option IDs to hide for the 50/50 eliminate bonus."""
    session = await get_session_by_slug(db, session_slug)

    if not getattr(session, "bonuses_enabled", False) or not getattr(session, "bonus_eliminate", False):
        raise ValidationException("Eliminate bonus is not enabled for this session")

    q_stmt = select(Question).where(
        Question.id == question_id,
        Question.quiz_id == session.quiz_id,
    )
    question = (await db.execute(q_stmt)).scalar_one_or_none()
    if not question:
        raise NotFoundException(resource="Question")

    wrong_options = [opt["id"] for opt in question.options if not opt.get("is_correct")]
    random.shuffle(wrong_options)
    return {"options_to_hide": wrong_options[:2]}


# ── Anti-cheat telemetry ──────────────────────────────────────────────────────

async def ingest_telemetry(
    db: AsyncSession,
    session_slug: str,
    attempt_id: uuid.UUID,
    events: list[dict],
) -> None:
    """Persist client-side anti-cheat events for an attempt."""
    session = await get_session_by_slug(db, session_slug)
    stmt = select(Attempt).where(Attempt.id == attempt_id, Attempt.session_id == session.id)
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if not attempt:
        raise NotFoundException(resource="Attempt")

    for ev in events:
        event_type = str(ev.get("event_type", ""))[:50]
        payload = ev.get("payload")
        raw_ts = ev.get("client_ts")
        client_ts = None
        if raw_ts:
            try:
                from datetime import timezone
                client_ts = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                pass
        db.add(TelemetryEvent(
            attempt_id=attempt_id,
            event_type=event_type,
            payload=payload if isinstance(payload, dict) else None,
            client_ts=client_ts,
        ))

    await db.commit()


# ── Partial progress saving ───────────────────────────────────────────────────

async def save_progress(
    db: AsyncSession,
    session_slug: str,
    attempt_id: uuid.UUID,
    answers: dict,
) -> None:
    """Save partial answers for an in-progress attempt (best-effort)."""
    session = await get_session_by_slug(db, session_slug)
    stmt = select(Attempt).where(
        Attempt.id == attempt_id,
        Attempt.session_id == session.id,
        Attempt.status == "in_progress",
    )
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if not attempt:
        return  # silently ignore if attempt not found or already completed
    attempt.partial_answers = answers
    await db.commit()
