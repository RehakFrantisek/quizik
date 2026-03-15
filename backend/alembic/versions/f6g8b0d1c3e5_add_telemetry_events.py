"""Add telemetry_events table for anti-cheat

Revision ID: f6g8b0d1c3e5
Revises: e5f7a9c2b4d6
Create Date: 2026-03-14 21:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f6g8b0d1c3e5"
down_revision: Union[str, None] = "e5f7a9c2b4d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "telemetry_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attempt_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("client_ts", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_telemetry_events_attempt_id", "telemetry_events", ["attempt_id"])


def downgrade() -> None:
    op.drop_index("ix_telemetry_events_attempt_id", table_name="telemetry_events")
    op.drop_table("telemetry_events")
