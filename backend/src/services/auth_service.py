"""Quizik API — Authentication service (JWT + password hashing)."""

import uuid
from datetime import datetime, timedelta

import bcrypt
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.exceptions import ConflictException, UnauthorizedException
from src.models.invitation_code import InvitationCode
from src.models.login_log import UserLoginLog
from src.models.user import User

_ALGORITHM = "HS256"


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID:
    """Decode JWT and return user_id.  Raises UnauthorizedException on failure."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")
        sub = payload.get("sub")
        if not sub:
            raise UnauthorizedException("Invalid token payload")
        return uuid.UUID(sub)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")


# ── Login logging ─────────────────────────────────────────────────────────────

async def create_login_log(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Create a login/activity log entry for a user."""
    log = UserLoginLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow(),
    )
    db.add(log)
    await db.commit()


# ── Invitation code helpers ───────────────────────────────────────────────────

async def _fetch_invitation_code(
    db: AsyncSession,
    code: str,
    email: str,
) -> InvitationCode:
    """Fetch and pre-validate an invitation code without consuming it.

    Raises HTTPException 400 if the code is invalid, already used, or locked to
    a different email address.
    """
    stmt = select(InvitationCode).where(InvitationCode.code == code)
    invitation = (await db.execute(stmt)).scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid invitation code")
    if invitation.used_by_id is not None:
        raise HTTPException(status_code=400, detail="Invitation code has already been used")
    if invitation.email is not None and invitation.email.lower() != email.lower():
        raise HTTPException(status_code=400, detail="Invitation code is not valid for this email address")

    return invitation


async def validate_invitation_code(
    db: AsyncSession,
    code: str,
    email: str,
    used_by_id: uuid.UUID,
) -> InvitationCode:
    """Validate an invitation code and mark it as used.

    Raises HTTPException 400 if the code is invalid, already used, or locked to
    a different email address.
    """
    invitation = await _fetch_invitation_code(db, code, email)
    invitation.used_by_id = used_by_id
    invitation.used_at = datetime.utcnow()
    await db.commit()
    await db.refresh(invitation)
    return invitation


# ── User operations ───────────────────────────────────────────────────────────

async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    display_name: str | None,
    role: str = "teacher",
    invitation_code: str | None = None,
) -> User:
    """Create a new user.  Raises ConflictException if email taken.

    An invitation code is required; raises HTTPException 400 if missing or invalid.
    The code is validated before the user row is written, and consumed atomically
    in the same commit so no orphaned user can exist with an unconsumed code.
    """
    if not invitation_code:
        raise HTTPException(status_code=400, detail="An invitation code is required to register")

    # Pre-validate the code before touching the users table; raises 400 if bad.
    invitation = await _fetch_invitation_code(db, invitation_code, email)

    stmt = select(User).where(User.email == email.lower())
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise ConflictException("Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=email.lower(),
        display_name=display_name or email.split("@")[0],
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    # Flush user INSERT first so the FK on invitation_codes.used_by_id resolves.
    await db.flush()

    # Consume the invitation code in the same transaction as the user creation.
    invitation.used_by_id = user.id
    invitation.used_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> User:
    """Verify credentials.  Raises UnauthorizedException on failure."""
    stmt = select(User).where(User.email == email.lower())
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")
    if not user.is_active:
        raise UnauthorizedException("Account is disabled")
    return user


async def get_or_create_google_user(
    db: AsyncSession,
    google_id: str,
    email: str,
    display_name: str | None,
    avatar_url: str | None,
) -> User:
    """Find or create a user from Google OAuth.  Returns the user."""
    # First try to find by google_id
    stmt = select(User).where(User.google_id == google_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user:
        return user

    # Try to find by email (link existing account)
    stmt = select(User).where(User.email == email.lower())
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user:
        user.google_id = google_id
        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url
        await db.commit()
        await db.refresh(user)
        return user

    # Create new user (no password)
    user = User(
        email=email.lower(),
        display_name=display_name or email.split("@")[0],
        password_hash=None,
        google_id=google_id,
        avatar_url=avatar_url,
        role="teacher",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def update_display_name(db: AsyncSession, user: User, display_name: str) -> User:
    user.display_name = display_name.strip()
    await db.commit()
    await db.refresh(user)
    return user


async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
    from src.exceptions import ValidationException
    if not user.password_hash:
        raise ValidationException("Password change not available for Google accounts")
    if not verify_password(current_password, user.password_hash):
        raise ValidationException("Current password is incorrect")
    user.password_hash = hash_password(new_password)
    await db.commit()
