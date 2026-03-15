"""Quizik API — Group service (classroom containers for sessions)."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.exceptions import ForbiddenException, NotFoundException
from src.models.group import Group
from src.models.quiz_session import QuizSession
from src.schemas.group import GroupCreate, GroupUpdate


async def create_group(db: AsyncSession, owner_id: uuid.UUID, data: GroupCreate) -> Group:
    group = Group(owner_id=owner_id, name=data.name, description=data.description)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


async def list_groups(db: AsyncSession, owner_id: uuid.UUID) -> list[Group]:
    stmt = (
        select(Group)
        .where(Group.owner_id == owner_id)
        .order_by(Group.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_group(db: AsyncSession, group_id: uuid.UUID) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundException(resource="Group")
    return group


async def update_group(
    db: AsyncSession, group_id: uuid.UUID, owner_id: uuid.UUID, data: GroupUpdate
) -> Group:
    group = await get_group(db, group_id)
    if group.owner_id != owner_id:
        raise ForbiddenException("Not the group owner")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    await db.commit()
    await db.refresh(group)
    return group


async def delete_group(db: AsyncSession, group_id: uuid.UUID, owner_id: uuid.UUID) -> None:
    group = await get_group(db, group_id)
    if group.owner_id != owner_id:
        raise ForbiddenException("Not the group owner")
    await db.delete(group)
    await db.commit()


async def count_sessions_by_group(
    db: AsyncSession, group_ids: list[uuid.UUID]
) -> dict[uuid.UUID, int]:
    if not group_ids:
        return {}
    stmt = (
        select(QuizSession.group_id, func.count(QuizSession.id))
        .where(QuizSession.group_id.in_(group_ids))
        .group_by(QuizSession.group_id)
    )
    rows = (await db.execute(stmt)).all()
    return {row[0]: row[1] for row in rows}


async def list_sessions_in_group(
    db: AsyncSession, group_id: uuid.UUID, owner_id: uuid.UUID
) -> list[QuizSession]:
    group = await get_group(db, group_id)
    if group.owner_id != owner_id:
        raise ForbiddenException("Not the group owner")
    stmt = (
        select(QuizSession)
        .where(QuizSession.group_id == group_id)
        .options(selectinload(QuizSession.quiz))
        .order_by(QuizSession.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())
