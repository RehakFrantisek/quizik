"""Quizik API — Answer model."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, SmallInteger
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

    # Indexes
    __table_args__ = (
        Index("ix_answers_attempt_id", "attempt_id"),
    )

    # Relationships
    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="answers")  # noqa: F821
    question: Mapped["Question"] = relationship("Question", back_populates="answers")  # noqa: F821
