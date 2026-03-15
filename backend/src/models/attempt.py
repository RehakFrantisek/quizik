"""Quizik API — Attempt model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), index=True)

    # Session-based publishing (nullable for backward compat with direct quiz-slug flow)
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("quiz_sessions.id", ondelete="CASCADE"), index=True, nullable=True
    )

    # Nullable for anonymous participants
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    participant_name: Mapped[str] = mapped_column(String(100))

    # Device fingerprint for one-attempt sessions (stored client-side in localStorage)
    device_token: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="in_progress")  # in_progress, completed, abandoned

    # Soft-delete from leaderboard (teacher can hide without destroying data)
    hidden_from_leaderboard: Mapped[bool] = mapped_column(Boolean, default=False)

    score: Mapped[int | None] = mapped_column(SmallInteger)
    max_score: Mapped[int | None] = mapped_column(SmallInteger)
    percentage: Mapped[float | None] = mapped_column(Float)
    time_spent_sec: Mapped[int | None] = mapped_column(SmallInteger)
    # Gamification: raw tap total from minigames (each 10 taps ≈ 1 bonus point)
    minigame_score: Mapped[int] = mapped_column(SmallInteger, default=0, server_default="0")

    # Partial progress saved during in-progress attempt (incremental save from client)
    partial_answers: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Indexes
    __table_args__ = (
        Index("ix_attempts_quiz_id_completed_at", "quiz_id", "completed_at"),
    )

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="attempts")  # noqa: F821
    session: Mapped["QuizSession | None"] = relationship("QuizSession", back_populates="attempts")  # noqa: F821
    user: Mapped["User"] = relationship("User", back_populates="attempts")  # noqa: F821
    answers: Mapped[list["Answer"]] = relationship(  # noqa: F821
        "Answer", back_populates="attempt", cascade="all, delete-orphan"
    )
    telemetry_events: Mapped[list["TelemetryEvent"]] = relationship(  # noqa: F821
        "TelemetryEvent", back_populates="attempt", cascade="all, delete-orphan"
    )
