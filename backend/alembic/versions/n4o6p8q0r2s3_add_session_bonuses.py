"""add bonus settings to quiz_sessions

Revision ID: n4o6p8q0r2s3
Revises: m3n5o7p9q1r2
Create Date: 2026-03-15 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "n4o6p8q0r2s3"
down_revision = "m3n5o7p9q1r2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Master toggle for bonuses (power-ups)
    op.add_column(
        "quiz_sessions",
        sa.Column("bonuses_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Which bonuses are available
    op.add_column(
        "quiz_sessions",
        sa.Column("bonus_eliminate", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column("bonus_second_chance", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column("bonus_end_correction", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("quiz_sessions", "bonus_end_correction")
    op.drop_column("quiz_sessions", "bonus_second_chance")
    op.drop_column("quiz_sessions", "bonus_eliminate")
    op.drop_column("quiz_sessions", "bonuses_enabled")
