"""add max_repeats, question_count, shuffle overrides, anticheat to quiz_sessions

Revision ID: m3n5o7p9q1r2
Revises: l2m4n6o8p0q1
Create Date: 2026-03-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "m3n5o7p9q1r2"
down_revision = "l2m4n6o8p0q1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # max_repeats: 0 = unlimited, N = allow N completions per device
    op.add_column(
        "quiz_sessions",
        sa.Column("max_repeats", sa.Integer(), nullable=False, server_default="0"),
    )
    # question_count: 0 = all questions, N = randomly pick N questions
    op.add_column(
        "quiz_sessions",
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="0"),
    )
    # session-level shuffle overrides (NULL = inherit quiz setting)
    op.add_column(
        "quiz_sessions",
        sa.Column("shuffle_questions", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column("shuffle_options", sa.Boolean(), nullable=True),
    )
    # anti-cheat settings
    op.add_column(
        "quiz_sessions",
        sa.Column("anticheat_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column("anticheat_tab_switch", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column("anticheat_fast_answer", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("quiz_sessions", "anticheat_fast_answer")
    op.drop_column("quiz_sessions", "anticheat_tab_switch")
    op.drop_column("quiz_sessions", "anticheat_enabled")
    op.drop_column("quiz_sessions", "shuffle_options")
    op.drop_column("quiz_sessions", "shuffle_questions")
    op.drop_column("quiz_sessions", "question_count")
    op.drop_column("quiz_sessions", "max_repeats")
