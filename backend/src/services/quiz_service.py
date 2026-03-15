"""Quizik API — Quiz service."""

import uuid
from datetime import datetime
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.quiz import Quiz
from src.schemas.quiz import QuizCreate, QuizUpdate
from src.exceptions import NotFoundException, ForbiddenException, ValidationException

async def create_quiz(db: AsyncSession, author_id: uuid.UUID, quiz_in: QuizCreate) -> Quiz:
    default_settings = {
        "time_limit_sec": 600,
        "shuffle_questions": True,
        "shuffle_options": False,
        "show_results": "end",
        "passing_score_pct": 70,
        "allow_anonymous": True,
        "max_attempts_per_ip": 5,
    }
    settings = quiz_in.settings.model_dump() if quiz_in.settings else default_settings
    db_quiz = Quiz(
        author_id=author_id,
        title=quiz_in.title,
        description=quiz_in.description,
        settings=settings,
    )
    db.add(db_quiz)
    await db.commit()
    return await get_quiz(db, db_quiz.id)

async def get_quiz(db: AsyncSession, quiz_id: uuid.UUID) -> Quiz:
    stmt = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
    result = await db.execute(stmt)
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise NotFoundException(resource="Quiz")
    return quiz

async def get_quizzes(db: AsyncSession, author_id: uuid.UUID) -> list[Quiz]:
    stmt = select(Quiz).where(Quiz.author_id == author_id).order_by(Quiz.created_at.desc()).options(selectinload(Quiz.questions))
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def delete_quiz(db: AsyncSession, quiz_id: uuid.UUID, author_id: uuid.UUID) -> None:
    quiz = await get_quiz(db, quiz_id)
    if quiz.author_id != author_id:
        raise ForbiddenException("Not authorized to delete this quiz")
    await db.delete(quiz)
    await db.commit()


async def get_quiz_preview(db: AsyncSession, share_slug: str) -> dict:
    """Return public info about a quiz by its share_slug (no auth needed)."""
    quiz = await get_quiz_by_share_slug(db, share_slug)
    return {
        "share_slug": quiz.share_slug,
        "title": quiz.title,
        "description": quiz.description,
        "question_count": len(quiz.questions),
        "status": quiz.status,
    }


async def get_quiz_by_share_slug(db: AsyncSession, share_slug: str) -> Quiz:
    stmt = select(Quiz).where(Quiz.share_slug == share_slug).options(selectinload(Quiz.questions))
    quiz = (await db.execute(stmt)).scalar_one_or_none()
    if not quiz:
        raise NotFoundException(resource="Quiz")
    return quiz


async def update_quiz(db: AsyncSession, quiz_id: uuid.UUID, author_id: uuid.UUID, quiz_in: QuizUpdate) -> Quiz:
    quiz = await get_quiz(db, quiz_id)
    if quiz.author_id != author_id:
        raise ForbiddenException("Not authorized to edit this quiz")
    
    update_data = quiz_in.model_dump(exclude_unset=True)
    if "settings" in update_data and update_data["settings"] is not None:
        quiz.settings = {**quiz.settings, **update_data["settings"]}
        del update_data["settings"]

    # Status publishing rules
    if quiz_in.status == "published" and quiz.status != "published":
        # Make sure questions are loaded to check length
        stmt = select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
        result = await db.execute(stmt)
        quiz_with_questions = result.scalar_one()
        if not quiz_with_questions.questions:
            raise ValidationException("Cannot publish a quiz with no questions")
        if not quiz.share_slug:
            quiz.share_slug = secrets.token_urlsafe(6)
        quiz.published_at = datetime.utcnow()

    for field, value in update_data.items():
        setattr(quiz, field, value)

    await db.commit()
    await db.refresh(quiz)
    return quiz
