"""Quizik API — Attempt model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), index=True)

    # Nullable for anonymous participants
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    participant_name: Mapped[str] = mapped_column(String(100))

    status: Mapped[str] = mapped_column(String(50), default="in_progress")  # in_progress, completed, abandoned

    score: Mapped[int | None] = mapped_column(SmallInteger)
    max_score: Mapped[int | None] = mapped_column(SmallInteger)
    percentage: Mapped[float | None] = mapped_column(Float)
    time_spent_sec: Mapped[int | None] = mapped_column(SmallInteger)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Indexes
    __table_args__ = (
        Index("ix_attempts_quiz_id_completed_at", "quiz_id", "completed_at"),
    )

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="attempts")  # noqa: F821
    user: Mapped["User"] = relationship("User", back_populates="attempts")  # noqa: F821
    answers: Mapped[list["Answer"]] = relationship(  # noqa: F821
        "Answer", back_populates="attempt", cascade="all, delete-orphan"
    )
