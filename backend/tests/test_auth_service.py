"""Tests for authentication service — password hashing and JWT tokens."""

import uuid
from datetime import timedelta

import pytest
from src.services.auth_service import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from src.exceptions import UnauthorizedException


# ── Password hashing ──────────────────────────────────────────────────────────

def test_hash_password_returns_bcrypt_string():
    hashed = hash_password("supersecret123")
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")


def test_verify_password_correct():
    hashed = hash_password("supersecret123")
    assert verify_password("supersecret123", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("supersecret123")
    assert verify_password("wrongpassword", hashed) is False


# ── JWT tokens ────────────────────────────────────────────────────────────────

def test_create_and_decode_token():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    decoded = decode_access_token(token)
    assert decoded == user_id


def test_decode_invalid_token_raises():
    with pytest.raises(UnauthorizedException):
        decode_access_token("not-a-valid-token")


def test_decode_wrong_secret_raises():
    """Tokens signed with a different secret should be rejected."""
    from jose import jwt

    fake_payload = {"sub": str(uuid.uuid4()), "type": "access"}
    bad_token = jwt.encode(fake_payload, "wrong-secret", algorithm="HS256")
    with pytest.raises(UnauthorizedException):
        decode_access_token(bad_token)


def test_decode_wrong_type_raises():
    """A refresh token (wrong type) should be rejected by decode_access_token."""
    from jose import jwt
    from src.config import settings

    payload = {"sub": str(uuid.uuid4()), "type": "refresh"}
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    with pytest.raises(UnauthorizedException):
        decode_access_token(token)
