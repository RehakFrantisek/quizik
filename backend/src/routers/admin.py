"""Quizik API — Admin router."""

import secrets
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db
from src.models.user import User
from src.models.invitation_code import InvitationCode
from src.models.login_log import UserLoginLog
from src.services import auth_service

router = APIRouter(prefix="/admin", tags=["admin"])


async def get_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserAdminOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None
    role: str
    is_active: bool
    has_password: bool
    created_at: datetime
    avatar_url: str | None

    class Config:
        from_attributes = True

    @classmethod
    def from_user(cls, user: User) -> "UserAdminOut":
        return cls(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            is_active=user.is_active,
            has_password=user.password_hash is not None,
            created_at=user.created_at,
            avatar_url=user.avatar_url,
        )


class UpdateUserRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    role: str | None = Field(default=None, pattern="^(teacher|student|admin)$")
    is_active: bool | None = None
    new_password: str | None = Field(default=None, min_length=8)


class CodeOut(BaseModel):
    id: uuid.UUID
    code: str
    email: str | None
    used: bool
    used_at: datetime | None
    created_at: datetime

    @classmethod
    def from_code(cls, c: InvitationCode) -> "CodeOut":
        return cls(
            id=c.id,
            code=c.code,
            email=c.email,
            used=c.used_by_id is not None,
            used_at=c.used_at,
            created_at=c.created_at,
        )


class CreateCodeRequest(BaseModel):
    email: str | None = None  # lock to specific email (optional)


class LogOut(BaseModel):
    id: uuid.UUID
    action: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserAdminOut])
async def list_users(
    admin: Annotated[User, Depends(get_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserAdminOut.from_user(u) for u in users]


@router.patch("/users/{user_id}", response_model=UserAdminOut)
async def update_user(
    user_id: uuid.UUID,
    body: UpdateUserRequest,
    admin: Annotated[User, Depends(get_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.new_password:
        user.password_hash = auth_service.hash_password(body.new_password)
    await db.commit()
    await db.refresh(user)
    return UserAdminOut.from_user(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    admin: Annotated[User, Depends(get_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


@router.get("/users/{user_id}/logs", response_model=list[LogOut])
async def get_user_logs(
    user_id: uuid.UUID,
    admin: Annotated[User, Depends(get_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(UserLoginLog)
        .where(UserLoginLog.user_id == user_id)
        .order_by(UserLoginLog.created_at.desc())
        .limit(200)
    )
    logs = result.scalars().all()
    return [LogOut(id=l.id, action=l.action, ip_address=l.ip_address, user_agent=l.user_agent, created_at=l.created_at) for l in logs]


@router.get("/codes", response_model=list[CodeOut])
async def list_codes(
    admin: Annotated[User, Depends(get_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(InvitationCode).order_by(InvitationCode.created_at.desc()))
    codes = result.scalars().all()
    return [CodeOut.from_code(c) for c in codes]


@router.post("/codes", response_model=CodeOut, status_code=201)
async def create_code(
    body: CreateCodeRequest,
    admin: Annotated[User, Depends(get_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    code = InvitationCode(
        code=secrets.token_urlsafe(12),
        email=body.email,
        created_by_id=admin.id,
        created_at=datetime.utcnow(),
    )
    db.add(code)
    await db.commit()
    await db.refresh(code)
    return CodeOut.from_code(code)


@router.delete("/codes/{code_id}", status_code=204)
async def delete_code(
    code_id: uuid.UUID,
    admin: Annotated[User, Depends(get_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(InvitationCode).where(InvitationCode.id == code_id))
    code = result.scalar_one_or_none()
    if not code:
        raise HTTPException(status_code=404, detail="Code not found")
    if code.used_by_id is not None:
        raise HTTPException(status_code=400, detail="Cannot delete a used code")
    await db.delete(code)
    await db.commit()
