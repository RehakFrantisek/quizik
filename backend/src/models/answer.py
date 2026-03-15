"""Quizik API — Answer model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, SmallInteger, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("attempts.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)

    # response can be literal text or array of selected option IDs
    response: Mapped[dict | list | str | None] = mapped_column(JSONB)

    is_correct: Mapped[bool] = mapped_column(Boolean)
    points_awarded: Mapped[int] = mapped_column(SmallInteger, default=0)
    time_spent_sec: Mapped[int | None] = mapped_column(SmallInteger)

    # Manual score override by teacher
    points_override: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    override_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    override_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_answers_attempt_id", "attempt_id"),
    )

    # Relationships
    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="answers")  # noqa: F821
    question: Mapped["Question"] = relationship("Question", back_populates="answers")  # noqa: F821
