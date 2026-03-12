"""Quizik API — User model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    quizzes: Mapped[list["Quiz"]] = relationship(  # noqa: F821
        "Quiz", back_populates="author", cascade="all, delete-orphan"
    )
    attempts: Mapped[list["Attempt"]] = relationship(  # noqa: F821
        "Attempt", back_populates="user"
    )
    import_jobs: Mapped[list["ImportJob"]] = relationship(  # noqa: F821
        "ImportJob", back_populates="user", cascade="all, delete-orphan"
    )
