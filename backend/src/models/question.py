"""Quizik API — Question model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(SmallInteger)
    type: Mapped[str] = mapped_column(String(50))  # single_choice, multiple_choice, true_false, short_answer
    body: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)

    # options JSONB contract: [{"id": "a", "text": "Paris", "is_correct": True}]
    options: Mapped[list[dict]] = mapped_column(JSONB, default=list)

    points: Mapped[int] = mapped_column(SmallInteger, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Indexes
    __table_args__ = (
        Index("ix_questions_quiz_id_position", "quiz_id", "position"),
    )

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="questions")  # noqa: F821
    answers: Mapped[list["Answer"]] = relationship(  # noqa: F821
        "Answer", back_populates="question", cascade="all, delete-orphan"
    )
