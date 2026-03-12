"""Quizik API — QuizAnalytics model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class QuizAnalytics(Base):
    __tablename__ = "quiz_analytics"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), unique=True, index=True)

    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    avg_score_pct: Mapped[float] = mapped_column(Float, default=0.0)
    avg_time_sec: Mapped[float] = mapped_column(Float, default=0.0)
    completion_rate: Mapped[float] = mapped_column(Float, default=0.0)

    # {"0-10": 2, "10-20": 5, ...}
    score_distribution: Mapped[dict] = mapped_column(JSONB, default=dict)
    # [{"question_id": "uuid", "accuracy": 0.8, "avg_time_sec": 12.5}]
    question_stats: Mapped[dict] = mapped_column(JSONB, default=dict)

    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="analytics")  # noqa: F821
