"""Quizik API — Session service (create, clone, manage)."""

import secrets
import uuid
from datetime import datetime

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.exceptions import ForbiddenException, NotFoundException, ValidationException
from src.models.answer import Answer
from src.models.attempt import Attempt
from src.models.question import Question
from src.models.quiz import Quiz
from src.models.quiz_session import QuizSession
from src.models.user import User
from src.schemas.session import ScoreOverrideRequest, SessionCreate, SessionUpdate
from src.services.evaluation_service import evaluate_answer


# ── Quiz cloning ──────────────────────────────────────────────────────────────

async def clone_quiz(db: AsyncSession, quiz_id: uuid.UUID, new_owner: User, is_imported: bool = False) -> Quiz:
    """Deep-clone a quiz template into a new quiz owned by new_owner."""
    stmt = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()
    if not source:
        raise NotFoundException(resource="Quiz")

    cloned = Quiz(
        author_id=new_owner.id,
        title=f"Copy of {source.title}",
        description=source.description,
        cover_image_url=source.cover_image_url,
        settings=dict(source.settings),
        clone_of_id=source.id,
        is_imported=is_imported,
    )
    db.add(cloned)
    await db.flush()  # get cloned.id before adding questions

    for q in source.questions:
        db.add(
            Question(
                quiz_id=cloned.id,
                position=q.position,
                type=q.type,
                body=q.body,
                explanation=q.explanation,
                options=list(q.options),
                accepted_answers=list(q.accepted_answers) if q.accepted_answers else None,
                points=q.points,
                image_url=q.image_url,
            )
        )

    await db.commit()
    # Reload with questions
    stmt2 = select(Quiz).where(Quiz.id == cloned.id).options(selectinload(Quiz.questions))
    return (await db.execute(stmt2)).scalar_one()


# ── Session CRUD ──────────────────────────────────────────────────────────────

def _generate_session_slug() -> str:
    return secrets.token_urlsafe(8)[:10]


async def create_session(db: AsyncSession, owner: User, data: SessionCreate) -> QuizSession:
    """Create a new QuizSession from an existing quiz template."""
    # Verify quiz exists and owner has access
    stmt = select(Quiz).where(Quiz.id == data.quiz_id).options(selectinload(Quiz.questions))
    quiz = (await db.execute(stmt)).scalar_one_or_none()
    if not quiz:
        raise NotFoundException(resource="Quiz")
    if quiz.author_id != owner.id:
        raise ForbiddenException("Only the quiz owner can create sessions from it")
    if not quiz.questions:
        raise ValidationException("Cannot create a session for a quiz with no questions")

    # Auto-schedule: if starts_at is in the future, mark as scheduled (Celery will open it)
    now = datetime.utcnow()
    initial_status = "active"
    if data.starts_at and data.starts_at.replace(tzinfo=None) > now:
        initial_status = "scheduled"

    session = QuizSession(
        quiz_id=data.quiz_id,
        owner_id=owner.id,
        title=data.title,
        group_id=data.group_id,
        session_slug=_generate_session_slug(),
        status=initial_status,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        leaderboard_enabled=data.leaderboard_enabled,
        play_mode=data.play_mode,
        gamification_enabled=data.gamification_enabled,
        minigame_type=data.minigame_type,
        minigame_config=data.minigame_config,
        minigame_trigger_mode=data.minigame_trigger_mode,
        minigame_trigger_n=data.minigame_trigger_n,
        max_repeats=data.max_repeats,
        question_count=data.question_count,
        shuffle_questions=data.shuffle_questions,
        shuffle_options=data.shuffle_options,
        anticheat_enabled=data.anticheat_enabled,
        anticheat_tab_switch=data.anticheat_tab_switch,
        anticheat_fast_answer=data.anticheat_fast_answer,
        bonuses_enabled=data.bonuses_enabled,
        bonus_eliminate=data.bonus_eliminate,
        bonus_second_chance=data.bonus_second_chance,
        bonus_end_correction=data.bonus_end_correction,
        bonus_unlock_mode=data.bonus_unlock_mode,
        bonus_unlock_x=data.bonus_unlock_x,
        allow_repeat=data.allow_repeat,
        show_correct_answer=data.show_correct_answer,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: uuid.UUID) -> QuizSession:
    stmt = (
        select(QuizSession)
        .where(QuizSession.id == session_id)
        .options(selectinload(QuizSession.quiz))
    )
    session = (await db.execute(stmt)).scalar_one_or_none()
    if not session:
        raise NotFoundException(resource="QuizSession")
    return session


async def get_session_by_slug(db: AsyncSession, slug: str) -> QuizSession:
    stmt = select(QuizSession).where(QuizSession.session_slug == slug)
    result = (await db.execute(stmt)).scalar_one_or_none()
    if not result:
        raise NotFoundException(resource="QuizSession")
    return result


async def list_sessions(db: AsyncSession, owner_id: uuid.UUID) -> list[QuizSession]:
    stmt = (
        select(QuizSession)
        .where(QuizSession.owner_id == owner_id)
        .options(selectinload(QuizSession.quiz))
        .order_by(QuizSession.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def update_session(
    db: AsyncSession, session_id: uuid.UUID, owner_id: uuid.UUID, data: SessionUpdate
) -> QuizSession:
    session = await get_session(db, session_id)
    if session.owner_id != owner_id:
        raise ForbiddenException("Not the session owner")
    update_dict = data.model_dump(exclude_unset=True)
    explicit_status = "status" in update_dict
    for field, value in update_dict.items():
        setattr(session, field, value)
    # Auto-recalculate status from time windows when not explicitly set
    if not explicit_status and session.status not in ("closed", "archived"):
        now = datetime.utcnow()
        starts = session.starts_at.replace(tzinfo=None) if session.starts_at else None
        ends = session.ends_at.replace(tzinfo=None) if session.ends_at else None
        if starts and starts > now:
            session.status = "scheduled"
        elif ends and ends <= now:
            session.status = "closed"
        else:
            session.status = "active"
    await db.commit()
    await db.refresh(session)
    return session


# ── Attempt/leaderboard management ───────────────────────────────────────────

async def list_attempts(
    db: AsyncSession, session_id: uuid.UUID, owner_id: uuid.UUID
) -> list[Attempt]:
    session = await get_session(db, session_id)
    if session.owner_id != owner_id:
        raise ForbiddenException("Not the session owner")
    stmt = (
        select(Attempt)
        .where(Attempt.session_id == session_id)
        .options(selectinload(Attempt.answers))
        .order_by(Attempt.completed_at.desc().nullslast())
    )
    attempts = list((await db.execute(stmt)).scalars().all())
    await _hydrate_in_progress_scores(db, session, attempts)
    return attempts


async def get_attempt_detail(
    db: AsyncSession, session_id: uuid.UUID, attempt_id: uuid.UUID, owner_id: uuid.UUID
) -> Attempt:
    session = await get_session(db, session_id)
    if session.owner_id != owner_id:
        raise ForbiddenException("Not the session owner")
    from src.models.telemetry import TelemetryEvent
    stmt = (
        select(Attempt)
        .where(Attempt.id == attempt_id, Attempt.session_id == session_id)
        .options(
            selectinload(Attempt.answers),
            selectinload(Attempt.telemetry_events),
        )
    )
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if not attempt:
        raise NotFoundException(resource="Attempt")
    return attempt


async def _hydrate_in_progress_scores(
    db: AsyncSession,
    session: QuizSession,
    attempts: list[Attempt],
) -> None:
    """Compute transient score/% for in-progress attempts from partial answers."""
    in_progress = [a for a in attempts if a.status == "in_progress"]
    if not in_progress:
        return

    q_stmt = select(Question).where(Question.quiz_id == session.quiz_id)
    questions = {str(q.id): q for q in (await db.execute(q_stmt)).scalars().all()}
    max_score = sum(q.points for q in questions.values())
    for attempt in in_progress:
        partial = attempt.partial_answers if isinstance(attempt.partial_answers, dict) else {}
        total = 0
        for q_id, response in partial.items():
            question = questions.get(str(q_id))
            if not question:
                continue
            _, points = evaluate_answer(question, response)
            total += points
        attempt.score = total
        attempt.max_score = max_score
        attempt.percentage = round(total / max_score * 100, 1) if max_score > 0 else 0.0


async def hide_attempt_from_leaderboard(
    db: AsyncSession, session_id: uuid.UUID, attempt_id: uuid.UUID, owner_id: uuid.UUID
) -> Attempt:
    """Soft-hide an attempt from the leaderboard (reversible)."""
    attempt = await get_attempt_detail(db, session_id, attempt_id, owner_id)
    attempt.hidden_from_leaderboard = True
    await db.commit()
    await db.refresh(attempt)
    return attempt


async def unhide_attempt_from_leaderboard(
    db: AsyncSession, session_id: uuid.UUID, attempt_id: uuid.UUID, owner_id: uuid.UUID
) -> Attempt:
    """Restore a hidden attempt to the leaderboard."""
    attempt = await get_attempt_detail(db, session_id, attempt_id, owner_id)
    attempt.hidden_from_leaderboard = False
    await db.commit()
    await db.refresh(attempt)
    return attempt


async def override_answer_score(
    db: AsyncSession,
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    answer_id: uuid.UUID,
    reviewer: User,
    override: ScoreOverrideRequest,
) -> Answer:
    """Manually override the points awarded for a specific answer."""
    # Verify session ownership
    session = await get_session(db, session_id)
    if session.owner_id != reviewer.id:
        raise ForbiddenException("Not the session owner")

    stmt = select(Answer).where(Answer.id == answer_id, Answer.attempt_id == attempt_id)
    answer = (await db.execute(stmt)).scalar_one_or_none()
    if not answer:
        raise NotFoundException(resource="Answer")

    answer.points_override = override.points_override
    answer.override_by_id = reviewer.id
    answer.override_at = datetime.utcnow()
    answer.override_reason = override.reason

    # Recalculate attempt score
    await _recalculate_attempt_score(db, attempt_id)
    await db.commit()
    await db.refresh(answer)
    return answer


async def _recalculate_attempt_score(db: AsyncSession, attempt_id: uuid.UUID) -> None:
    """Recompute attempt.score from answers (using overrides where present)."""
    stmt = select(Attempt).where(Attempt.id == attempt_id).options(selectinload(Attempt.answers)).with_for_update()
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if not attempt:
        return

    total = 0
    for ans in attempt.answers:
        if ans.points_override is not None:
            total += ans.points_override
        else:
            total += ans.points_awarded

    attempt.score = total
    if attempt.max_score and attempt.max_score > 0:
        attempt.percentage = round(total / attempt.max_score * 100, 1)


async def get_leaderboard(
    db: AsyncSession, session_id: uuid.UUID, include_in_progress: bool = False
) -> list[Attempt]:
    """Return visible attempts for a session sorted for leaderboard display."""
    session = await db.get(QuizSession, session_id)
    if not session:
        raise NotFoundException(resource="QuizSession")

    status_filter = ["completed", "in_progress"] if include_in_progress else ["completed"]
    if getattr(session, "play_mode", "quiz") in {"memory_pairs", "speed_match"}:
        order_fields = [
            case((Attempt.status == "completed", 0), else_=1),
            Attempt.time_spent_sec.asc().nullslast(),
            Attempt.score.desc().nullslast(),
            Attempt.completed_at.asc().nullslast(),
            Attempt.started_at.asc(),
        ]
    else:
        order_fields = [
            case((Attempt.status == "completed", 0), else_=1),
            Attempt.score.desc().nullslast(),
            Attempt.completed_at.asc().nullslast(),
            Attempt.started_at.asc(),
        ]
    stmt = (
        select(Attempt)
        .where(
            Attempt.session_id == session_id,
            Attempt.status.in_(status_filter),
            Attempt.hidden_from_leaderboard.is_(False),
        )
        .order_by(*order_fields)
    )
    return list((await db.execute(stmt)).scalars().all())


async def delete_session(
    db: AsyncSession, session_id: uuid.UUID, owner_id: uuid.UUID
) -> None:
    session = await get_session(db, session_id)
    if session.owner_id != owner_id:
        raise ForbiddenException("Not the session owner")
    await db.delete(session)
    await db.commit()


async def delete_attempt(
    db: AsyncSession, session_id: uuid.UUID, attempt_id: uuid.UUID, owner_id: uuid.UUID
) -> None:
    """Delete a specific attempt (teacher action)."""
    session = await get_session(db, session_id)
    if session.owner_id != owner_id:
        raise ForbiddenException("Not the session owner")
    stmt = select(Attempt).where(Attempt.id == attempt_id, Attempt.session_id == session_id)
    attempt = (await db.execute(stmt)).scalar_one_or_none()
    if not attempt:
        raise NotFoundException(resource="Attempt")
    await db.delete(attempt)
    await db.commit()


async def count_attempts_by_session(db: AsyncSession, session_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    """Return attempt counts keyed by session_id."""
    if not session_ids:
        return {}
    stmt = (
        select(Attempt.session_id, func.count(Attempt.id))
        .where(Attempt.session_id.in_(session_ids))
        .group_by(Attempt.session_id)
    )
    rows = (await db.execute(stmt)).all()
    return {row[0]: row[1] for row in rows}


async def get_session_analytics(
    db: AsyncSession, session_id: uuid.UUID, owner_id: uuid.UUID
) -> dict:
    """Return per-question answer statistics for all completed attempts in a session."""
    session = await get_session(db, session_id)
    if session.owner_id != owner_id:
        raise ForbiddenException("Not the session owner")

    stmt = (
        select(Attempt)
        .where(Attempt.session_id == session_id, Attempt.status == "completed")
        .options(selectinload(Attempt.answers))
    )
    attempts = list((await db.execute(stmt)).scalars().all())

    if not attempts:
        return {"total_attempts": 0, "questions": []}

    quiz_stmt = (
        select(Quiz)
        .where(Quiz.id == session.quiz_id)
        .options(selectinload(Quiz.questions))
    )
    quiz = (await db.execute(quiz_stmt)).scalar_one_or_none()
    questions_by_id: dict[str, Question] = {}
    if quiz:
        for q in quiz.questions:
            questions_by_id[str(q.id)] = q

    question_stats: dict[str, dict] = {}
    for attempt in attempts:
        for answer in attempt.answers:
            qid = str(answer.question_id)
            if qid not in question_stats:
                question_stats[qid] = {
                    "question_id": qid,
                    "total": 0,
                    "correct": 0,
                    "time_sum": 0,
                    "time_count": 0,
                    "option_counts": {},
                }
            s = question_stats[qid]
            s["total"] += 1
            if answer.is_correct:
                s["correct"] += 1
            if answer.time_spent_sec is not None:
                s["time_sum"] += answer.time_spent_sec
                s["time_count"] += 1
            resp = answer.response
            if isinstance(resp, list):
                for opt in resp:
                    s["option_counts"][str(opt)] = s["option_counts"].get(str(opt), 0) + 1
            elif isinstance(resp, str):
                s["option_counts"][resp] = s["option_counts"].get(resp, 0) + 1

    result_questions = []
    for qid, s in question_stats.items():
        q = questions_by_id.get(qid)
        result_questions.append({
            "question_id": qid,
            "position": q.position if q else 0,
            "body": q.body if q else "(unknown)",
            "total": s["total"],
            "correct": s["correct"],
            "accuracy": round(s["correct"] / s["total"] * 100, 1) if s["total"] > 0 else 0.0,
            "avg_time_sec": round(s["time_sum"] / s["time_count"], 1) if s["time_count"] > 0 else None,
            "option_counts": s["option_counts"],
            "options": [{"id": o["id"], "text": o["text"], "is_correct": o.get("is_correct", False)} for o in q.options] if q else [],
        })

    result_questions.sort(key=lambda x: x["position"])
    return {"total_attempts": len(attempts), "questions": result_questions}
