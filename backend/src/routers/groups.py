"""Quizik API — Groups router (classroom containers)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db
from src.models.user import User
from src.schemas.group import GroupCreate, GroupOut, GroupUpdate
from src.schemas.session import SessionOut
from src.services import group_service, session_service

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    body: GroupCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new group (e.g. classroom '3.A')."""
    group = await group_service.create_group(db, current_user.id, body)
    return GroupOut.model_validate(group).model_copy(update={"session_count": 0})


@router.get("", response_model=list[GroupOut])
async def list_groups(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all groups owned by the current user."""
    groups = await group_service.list_groups(db, current_user.id)
    if not groups:
        return []
    counts = await group_service.count_sessions_by_group(db, [g.id for g in groups])
    return [
        GroupOut.model_validate(g).model_copy(update={"session_count": counts.get(g.id, 0)})
        for g in groups
    ]


@router.get("/{group_id}", response_model=GroupOut)
async def get_group(
    group_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific group."""
    from src.exceptions import ForbiddenException
    group = await group_service.get_group(db, group_id)
    if group.owner_id != current_user.id:
        raise ForbiddenException()
    counts = await group_service.count_sessions_by_group(db, [group.id])
    return GroupOut.model_validate(group).model_copy(update={"session_count": counts.get(group.id, 0)})


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(
    group_id: uuid.UUID,
    body: GroupUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update group name/description."""
    group = await group_service.update_group(db, group_id, current_user.id, body)
    counts = await group_service.count_sessions_by_group(db, [group.id])
    return GroupOut.model_validate(group).model_copy(update={"session_count": counts.get(group.id, 0)})


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a group. Sessions in the group are unlinked (not deleted)."""
    await group_service.delete_group(db, group_id, current_user.id)


@router.get("/{group_id}/sessions", response_model=list[SessionOut])
async def list_group_sessions(
    group_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all sessions in a group."""
    sessions = await group_service.list_sessions_in_group(db, group_id, current_user.id)
    if not sessions:
        return []
    counts = await session_service.count_attempts_by_session(db, [s.id for s in sessions])
    return [_enrich(s, counts.get(s.id, 0)) for s in sessions]


def _enrich(session, attempt_count: int):
    data = SessionOut.model_validate(session)
    data.attempt_count = attempt_count
    try:
        data.quiz_title = session.quiz.title if session.quiz else None
    except Exception:
        data.quiz_title = None
    return data
