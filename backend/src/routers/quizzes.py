"""Quizik API — Quizzes router."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db
from src.models.user import User
from pydantic import BaseModel
from src.schemas.quiz import QuizCreate, QuizOut, QuizUpdate
from src.services import quiz_service, session_service

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

@router.post("", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_in: QuizCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Create a new quiz draft."""
    return await quiz_service.create_quiz(db, current_user.id, quiz_in)

@router.get("", response_model=list[QuizOut])
async def list_quizzes(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """List all quizzes owned by the current user."""
    return await quiz_service.get_quizzes(db, current_user.id)

@router.get("/{quiz_id}", response_model=QuizOut)
async def get_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Get a specific quiz by ID."""
    quiz = await quiz_service.get_quiz(db, quiz_id)
    if quiz.author_id != current_user.id:
        from src.exceptions import ForbiddenException
        raise ForbiddenException("Not authorized to view this quiz")
    return quiz

@router.patch("/{quiz_id}", response_model=QuizOut)
async def update_quiz(
    quiz_id: uuid.UUID,
    quiz_in: QuizUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Update quiz metadata and settings."""
    return await quiz_service.update_quiz(db, quiz_id, current_user.id, quiz_in)

@router.post("/{quiz_id}/publish", response_model=QuizOut)
async def publish_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Publish a quiz draft."""
    return await quiz_service.update_quiz(db, quiz_id, current_user.id, QuizUpdate(status="published"))


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a quiz owned by the current user."""
    await quiz_service.delete_quiz(db, quiz_id, current_user.id)


@router.post("/{quiz_id}/clone", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def clone_quiz(
    quiz_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Clone a quiz template into the current user's library."""
    cloned = await session_service.clone_quiz(db, quiz_id, current_user)
    return cloned


class ImportBySlugRequest(BaseModel):
    share_slug: str


@router.get("/preview/{share_slug}")
async def preview_quiz_by_slug(
    share_slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Public endpoint — returns basic quiz info by share slug (no auth required)."""
    return await quiz_service.get_quiz_preview(db, share_slug)


@router.post("/import-from-slug", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def import_quiz_by_slug(
    body: ImportBySlugRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Find a published quiz by its share slug and clone it into the current user's library."""
    source = await quiz_service.get_quiz_by_share_slug(db, body.share_slug)
    cloned = await session_service.clone_quiz(db, source.id, current_user, is_imported=True)
    return cloned
