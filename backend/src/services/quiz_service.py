"""Quizik API — Quiz service."""

import uuid
from datetime import datetime
import secrets
import csv
import io

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.quiz import Quiz
from src.models.question import Question
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
        cover_image_url=quiz_in.cover_image_url,
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


async def merge_quizzes(
    db: AsyncSession,
    target_quiz_id: uuid.UUID,
    author_id: uuid.UUID,
    source_quiz_ids: list[uuid.UUID],
    strategy: str = "append",
    deduplicate: bool = True,
) -> Quiz:
    target = await get_quiz(db, target_quiz_id)
    if target.author_id != author_id:
        raise ForbiddenException("Not authorized to edit this quiz")
    if not source_quiz_ids:
        raise ValidationException("No source quizzes selected")

    source_stmt = select(Quiz).where(Quiz.id.in_(source_quiz_ids), Quiz.author_id == author_id).options(selectinload(Quiz.questions))
    sources = list((await db.execute(source_stmt)).scalars().all())
    if len(sources) != len(set(source_quiz_ids)):
        raise ValidationException("One or more source quizzes were not found")

    existing_bodies = {q.body.strip().lower() for q in target.questions} if deduplicate else set()
    candidates: list[Question] = []
    for src in sources:
        for q in sorted(src.questions, key=lambda x: x.position):
            body_key = q.body.strip().lower()
            if deduplicate and body_key in existing_bodies:
                continue
            existing_bodies.add(body_key)
            candidates.append(q)

    if strategy == "interleave":
        merged: list[Question] = []
        target_sorted = sorted(target.questions, key=lambda x: x.position)
        max_len = max(len(target_sorted), len(candidates))
        for i in range(max_len):
            if i < len(target_sorted):
                merged.append(target_sorted[i])
            if i < len(candidates):
                merged.append(candidates[i])
        new_order = merged
    else:
        new_order = sorted(target.questions, key=lambda x: x.position) + candidates

    for idx, q in enumerate(new_order):
        if q.quiz_id == target.id:
            q.position = idx
            continue
        db.add(
            Question(
                quiz_id=target.id,
                position=idx,
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
    return await get_quiz(db, target_quiz_id)


async def export_quiz_json(db: AsyncSession, quiz_id: uuid.UUID, author_id: uuid.UUID) -> dict:
    quiz = await get_quiz(db, quiz_id)
    if quiz.author_id != author_id:
        raise ForbiddenException("Not authorized to export this quiz")
    questions = sorted(quiz.questions, key=lambda q: q.position)
    return {
        "quiz": {
            "id": str(quiz.id),
            "title": quiz.title,
            "description": quiz.description,
            "cover_image_url": quiz.cover_image_url,
            "status": quiz.status,
            "settings": quiz.settings,
        },
        "questions": [
            {
                "position": q.position,
                "type": q.type,
                "body": q.body,
                "explanation": q.explanation,
                "options": q.options,
                "accepted_answers": q.accepted_answers,
                "points": q.points,
                "image_url": q.image_url,
            }
            for q in questions
        ],
    }


async def export_quiz_csv(db: AsyncSession, quiz_id: uuid.UUID, author_id: uuid.UUID) -> str:
    quiz = await get_quiz(db, quiz_id)
    if quiz.author_id != author_id:
        raise ForbiddenException("Not authorized to export this quiz")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["type", "body", "option_a", "option_b", "option_c", "option_d", "correct", "points", "explanation"])
    for q in sorted(quiz.questions, key=lambda x: x.position):
        opts = q.options or []
        opt_texts = [str(o.get("text", "")) for o in opts[:4]]
        while len(opt_texts) < 4:
            opt_texts.append("")
        correct_ids = [str(o.get("id", "")) for o in opts if o.get("is_correct")]
        writer.writerow([q.type, q.body, *opt_texts, ",".join(correct_ids), q.points, q.explanation or ""])
    return output.getvalue()
