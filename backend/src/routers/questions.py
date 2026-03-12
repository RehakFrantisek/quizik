"""Quizik API — Questions router."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db
from src.models.user import User
from src.schemas.question import QuestionCreate, QuestionOut, QuestionUpdate
from src.services import question_service

router = APIRouter(prefix="/quizzes/{quiz_id}/questions", tags=["questions"])

@router.post("", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
async def add_question(
    quiz_id: uuid.UUID,
    question_in: QuestionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Add a question to a quiz."""
    return await question_service.create_question(db, quiz_id, current_user.id, question_in)

@router.patch("/{question_id}", response_model=QuestionOut)
async def update_question(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    question_in: QuestionUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Update an existing question."""
    return await question_service.update_question(db, quiz_id, question_id, current_user.id, question_in)

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Delete a question from a quiz."""
    await question_service.delete_question(db, quiz_id, question_id, current_user.id)
