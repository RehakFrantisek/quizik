"""Quizik API — User model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(100))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    role: Mapped[str] = mapped_column(String(50), default="teacher")  # teacher, student

    # Indexes
    __table_args__ = (
        Index("ix_users_google_id", "google_id"),
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
    owned_sessions: Mapped[list["QuizSession"]] = relationship(  # noqa: F821
        "QuizSession", back_populates="owner", cascade="all, delete-orphan"
    )
    owned_groups: Mapped[list["Group"]] = relationship(  # noqa: F821
        "Group", back_populates="owner", cascade="all, delete-orphan"
    )
