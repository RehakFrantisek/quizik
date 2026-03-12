"""Quizik API — Question service."""

import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.question import Question
from src.schemas.question import QuestionCreate, QuestionUpdate
from src.services.quiz_service import get_quiz
from src.exceptions import NotFoundException, ForbiddenException

async def create_question(db: AsyncSession, quiz_id: uuid.UUID, author_id: uuid.UUID, question_in: QuestionCreate) -> Question:
    quiz = await get_quiz(db, quiz_id)
    if quiz.author_id != author_id:
        raise ForbiddenException("Not authorized to edit this quiz")
    
    stmt = select(Question.position).where(Question.quiz_id == quiz_id).order_by(Question.position.desc()).limit(1)
    result = await db.execute(stmt)
    max_pos = result.scalar_one_or_none()
    next_pos = (max_pos or 0) + 1

    db_question = Question(
        quiz_id=quiz_id,
        position=next_pos,
        type=question_in.type,
        body=question_in.body,
        explanation=question_in.explanation,
        options=[opt.model_dump() for opt in question_in.options],
        points=question_in.points,
    )
    db.add(db_question)
    await db.commit()
    await db.refresh(db_question)
    return db_question

async def get_question(db: AsyncSession, quiz_id: uuid.UUID, question_id: uuid.UUID) -> Question:
    stmt = select(Question).where(Question.id == question_id, Question.quiz_id == quiz_id)
    result = await db.execute(stmt)
    question = result.scalar_one_or_none()
    if not question:
        raise NotFoundException(resource="Question")
    return question

async def update_question(db: AsyncSession, quiz_id: uuid.UUID, question_id: uuid.UUID, author_id: uuid.UUID, question_in: QuestionUpdate) -> Question:
    quiz = await get_quiz(db, quiz_id)
    if quiz.author_id != author_id:
        raise ForbiddenException("Not authorized to edit this quiz")
    
    question = await get_question(db, quiz_id, question_id)
    
    update_data = question_in.model_dump(exclude_unset=True)
    if "options" in update_data and update_data["options"] is not None:
        question.options = [opt for opt in update_data["options"]]
        del update_data["options"]

    for field, value in update_data.items():
        setattr(question, field, value)

    await db.commit()
    await db.refresh(question)
    return question

async def delete_question(db: AsyncSession, quiz_id: uuid.UUID, question_id: uuid.UUID, author_id: uuid.UUID):
    quiz = await get_quiz(db, quiz_id)
    if quiz.author_id != author_id:
        raise ForbiddenException("Not authorized to edit this quiz")
    
    question = await get_question(db, quiz_id, question_id)
    await db.delete(question)
    await db.commit()
