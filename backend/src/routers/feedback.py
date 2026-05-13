"""Quizik API — Feedback router."""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.dependencies import get_current_user, get_db
from src.models.feedback import Feedback
from src.models.user import User

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    image_url: str | None = Field(default=None, max_length=1024)


class FeedbackOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str | None
    user_display_name: str | None
    message: str
    image_url: str | None
    status: str
    admin_reply: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminReplyRequest(BaseModel):
    admin_reply: str | None = Field(default=None, max_length=5000)
    status: str | None = Field(default=None, pattern="^(open|resolved)$")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_out(fb: Feedback) -> FeedbackOut:
    return FeedbackOut(
        id=fb.id,
        user_id=fb.user_id,
        user_email=fb.user.email if fb.user else None,
        user_display_name=fb.user.display_name if fb.user else None,
        message=fb.message,
        image_url=fb.image_url,
        status=fb.status,
        admin_reply=fb.admin_reply,
        created_at=fb.created_at,
        updated_at=fb.updated_at,
    )


async def _load(db: AsyncSession, feedback_id: uuid.UUID) -> Feedback:
    stmt = (
        select(Feedback)
        .where(Feedback.id == feedback_id)
        .options(selectinload(Feedback.user))
    )
    fb = (await db.execute(stmt)).scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return fb


async def _require_admin(current_user: User) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── User endpoints ────────────────────────────────────────────────────────────

@router.post("", response_model=FeedbackOut, status_code=201)
async def submit_feedback(
    body: FeedbackCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    fb = Feedback(
        user_id=current_user.id,
        message=body.message,
        image_url=body.image_url,
    )
    db.add(fb)
    await db.commit()
    return _to_out(await _load(db, fb.id))


@router.get("/mine", response_model=list[FeedbackOut])
async def my_feedback(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    stmt = (
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .options(selectinload(Feedback.user))
        .order_by(Feedback.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_out(fb) for fb in rows]


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin", response_model=list[FeedbackOut])
async def list_all_feedback(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _require_admin(current_user)
    stmt = (
        select(Feedback)
        .options(selectinload(Feedback.user))
        .order_by(Feedback.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_out(fb) for fb in rows]


@router.patch("/admin/{feedback_id}", response_model=FeedbackOut)
async def reply_feedback(
    feedback_id: uuid.UUID,
    body: AdminReplyRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _require_admin(current_user)
    fb = await _load(db, feedback_id)
    if body.admin_reply is not None:
        fb.admin_reply = body.admin_reply
        fb.admin_id = current_user.id
    if body.status is not None:
        fb.status = body.status
    fb.updated_at = datetime.utcnow()
    await db.commit()
    return _to_out(await _load(db, fb.id))


@router.delete("/admin/{feedback_id}", status_code=204)
async def delete_feedback(
    feedback_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _require_admin(current_user)
    fb = await _load(db, feedback_id)
    await db.delete(fb)
    await db.commit()
