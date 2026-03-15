"""Quizik API — Group model (classroom / cohort container for sessions)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Group(Base):
    """A named container (e.g. a class like '3.A') that owns a set of sessions.

    Groups allow teachers to organise sessions by classroom without mixing
    leaderboards or attempt data across different cohorts.
    """

    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (Index("ix_groups_owner_id", "owner_id"),)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_groups")  # noqa: F821
    sessions: Mapped[list["QuizSession"]] = relationship(  # noqa: F821
        "QuizSession", back_populates="group", cascade="save-update, merge"
    )
