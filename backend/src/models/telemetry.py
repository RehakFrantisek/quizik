"""Quizik API — TelemetryEvent model (anti-cheat client events)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class TelemetryEvent(Base):
    """Anti-cheat client event captured during a quiz attempt.

    event_type values:
    - tab_hidden / tab_visible  — user switched away from tab
    - inactivity                — no input for > 30s
    - fast_answer               — answer submitted < 2s after question shown
    - focus_lost / focus_gained — window blur/focus
    - copy_paste                — paste detected in short_answer input
    """

    __tablename__ = "telemetry_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("attempts.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(50))
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Timestamp reported by the client (may differ from server time)
    client_ts: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        Index("ix_telemetry_events_attempt_id", "attempt_id"),
    )

    attempt: Mapped["Attempt"] = relationship("Attempt", back_populates="telemetry_events")  # noqa: F821
