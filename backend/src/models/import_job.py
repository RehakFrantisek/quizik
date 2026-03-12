"""Quizik API — ImportJob model."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # assigned after confirmation
    quiz_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("quizzes.id", ondelete="SET NULL"), index=True)

    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(512))

    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, processing, completed, failed

    # parsed question count, errors, warnings
    result: Mapped[dict | None] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Indexes
    __table_args__ = (
        Index("ix_import_jobs_user_id_status", "user_id", "status"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="import_jobs")  # noqa: F821
    quiz: Mapped["Quiz"] = relationship("Quiz")  # noqa: F821
