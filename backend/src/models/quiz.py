"""Quizik API — Quiz model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    share_slug: Mapped[str | None] = mapped_column(String(12), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, published, archived

    # default settings per ARCHITECTURE_SPEC.md JSONB contract
    settings: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "time_limit_sec": 600,
            "shuffle_questions": True,
            "shuffle_options": False,
            "show_results": "end",
            "passing_score_pct": 70,
            "allow_anonymous": True,
            "max_attempts_per_ip": 5,
        },
    )

    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Indexes
    __table_args__ = (Index("ix_quizzes_author_id_status", "author_id", "status"),)

    # Relationships
    author: Mapped["User"] = relationship("User", back_populates="quizzes")  # noqa: F821
    questions: Mapped[list["Question"]] = relationship(  # noqa: F821
        "Question", back_populates="quiz", cascade="all, delete-orphan", order_by="Question.position"
    )
    attempts: Mapped[list["Attempt"]] = relationship(  # noqa: F821
        "Attempt", back_populates="quiz", cascade="all, delete-orphan"
    )
    analytics: Mapped["QuizAnalytics"] = relationship(  # noqa: F821
        "QuizAnalytics", back_populates="quiz", cascade="all, delete-orphan", uselist=False
    )
