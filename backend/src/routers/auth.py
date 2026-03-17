"""Quizik API — Authentication router."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db
from src.models.user import User
from src.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas (inline to keep auth module self-contained) ───────────────────────

class RegisterRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)
    role: str = Field(default="teacher", pattern="^(teacher|student)$")
    invitation_code: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None
    role: str
    avatar_url: str | None
    has_password: bool = False

    @classmethod
    def from_user(cls, user: "User") -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            avatar_url=user.avatar_url,
            has_password=user.password_hash is not None,
        )

    class Config:
        from_attributes = True


AuthResponse.model_rebuild()


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new user and return a JWT access token."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user = await auth_service.register_user(
        db,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
        role=body.role,
        invitation_code=body.invitation_code,
    )
    token = auth_service.create_access_token(user.id)

    await auth_service.create_login_log(db, user.id, "register", ip_address, user_agent)

    return AuthResponse(access_token=token, user=UserOut.from_user(user))


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate with email + password and return a JWT access token."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user = await auth_service.authenticate_user(
        db,
        body.email,
        body.password,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    token = auth_service.create_access_token(user.id)

    await auth_service.create_login_log(db, user.id, "login", ip_address, user_agent)

    return AuthResponse(access_token=token, user=UserOut.from_user(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: Annotated[User, Depends(get_current_user)]):
    """Return the currently authenticated user."""
    return UserOut.from_user(current_user)


class UpdateProfileRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


@router.patch("/profile", response_model=UserOut)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update display name of the current user."""
    user = await auth_service.update_display_name(db, current_user, body.display_name)
    return UserOut.from_user(user)


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Change password of the current user."""
    from src.exceptions import ValidationException
    try:
        await auth_service.change_password(db, current_user, body.current_password, body.new_password)
    except ValidationException as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=e.message)


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password", status_code=200)
async def forgot_password(body: ForgotPasswordRequest):
    """Placeholder for forgot password flow (SMTP not yet configured)."""
    # Always return success to prevent email enumeration
    return {"message": "If this email is registered, a reset link will be sent."}


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token (JWT)
    invitation_code: str | None = None


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    body: GoogleAuthRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate with a Google ID token. Creates account on first login."""
    from src.config import settings
    from src.exceptions import ValidationException

    if not settings.google_client_id:
        raise ValidationException("Google OAuth is not configured")

    # Verify Google ID token (sync call wrapped in threadpool)
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    def _verify_sync(token: str, client_id: str) -> dict:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        return google_id_token.verify_oauth2_token(token, google_requests.Request(), client_id)

    import logging
    _log = logging.getLogger(__name__)

    loop = asyncio.get_event_loop()
    try:
        with ThreadPoolExecutor() as pool:
            idinfo = await loop.run_in_executor(pool, lambda: _verify_sync(body.credential, settings.google_client_id))
    except Exception as _exc:
        _log.error("Google token verification failed (client_id=%r): %s", settings.google_client_id, _exc)
        raise ValidationException("Invalid Google token")

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    display_name = idinfo.get("name")
    avatar_url = idinfo.get("picture")

    if not email:
        raise ValidationException("Google account has no email")

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user = await auth_service.get_or_create_google_user(db, google_id, email, display_name, avatar_url, body.invitation_code)
    token = auth_service.create_access_token(user.id)

    await auth_service.create_login_log(db, user.id, "google_login", ip_address, user_agent)

    return AuthResponse(access_token=token, user=UserOut.from_user(user))
