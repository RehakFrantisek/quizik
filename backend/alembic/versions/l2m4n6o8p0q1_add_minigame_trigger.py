"""add minigame_trigger_mode and minigame_trigger_n to quiz_sessions

Revision ID: l2m4n6o8p0q1
Revises: k1l3m5n6o7p8
Create Date: 2026-03-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "l2m4n6o8p0q1"
down_revision = "k1l3m5n6o7p8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quiz_sessions",
        sa.Column(
            "minigame_trigger_mode",
            sa.String(20),
            nullable=False,
            server_default="every_n",
        ),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column(
            "minigame_trigger_n",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )


def downgrade() -> None:
    op.drop_column("quiz_sessions", "minigame_trigger_n")
    op.drop_column("quiz_sessions", "minigame_trigger_mode")
