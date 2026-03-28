"""Quizik API — QuizSession model (published instance of a quiz template)."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class QuizSession(Base):
    """A published session derived from a quiz template.

    Represents a concrete playable instance:
    - leaderboard is scoped to this session
    - attempts belong to this session
    - teacher controls open/close, time window, leaderboard visibility
    """

    __tablename__ = "quiz_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"), index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Optional title override; falls back to quiz.title if None
    title: Mapped[str | None] = mapped_column(String(255))

    # Unique slug used in play URLs: /play/{session_slug}
    session_slug: Mapped[str] = mapped_column(String(16), unique=True, index=True)

    status: Mapped[str] = mapped_column(String(50), default="active")  # active, closed, archived

    # Optional time window
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Optional group (classroom) this session belongs to
    group_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("groups.id", ondelete="SET NULL"), index=True, nullable=True
    )

    leaderboard_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    gamification_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    minigame_type: Mapped[str] = mapped_column(String(50), default="tap_sprint", server_default="tap_sprint")
    minigame_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    minigame_trigger_mode: Mapped[str] = mapped_column(String(20), default="every_n", server_default="every_n")
    minigame_trigger_n: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    allow_repeat: Mapped[bool] = mapped_column(Boolean, default=True)
    max_repeats: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    show_correct_answer: Mapped[bool] = mapped_column(Boolean, default=True)
    question_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    shuffle_questions: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    shuffle_options: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    anticheat_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    anticheat_tab_switch: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    anticheat_fast_answer: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    bonuses_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    bonus_eliminate: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    bonus_second_chance: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    bonus_end_correction: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    bonus_unlock_mode: Mapped[str] = mapped_column(String(20), default="immediate", server_default="immediate")
    bonus_unlock_x: Mapped[int] = mapped_column(Integer, default=3, server_default="3")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (Index("ix_quiz_sessions_owner_id_status", "owner_id", "status"),)

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="sessions")  # noqa: F821
    owner: Mapped["User"] = relationship("User", back_populates="owned_sessions")  # noqa: F821
    group: Mapped["Group | None"] = relationship("Group", back_populates="sessions")  # noqa: F821
    attempts: Mapped[list["Attempt"]] = relationship(  # noqa: F821
        "Attempt", back_populates="session", cascade="all, delete-orphan"
    )
