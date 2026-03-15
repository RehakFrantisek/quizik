"""add minigame_type to quiz_sessions

Revision ID: k1l3m5n6o7p8
Revises: j0k2l4m5n6o7
Create Date: 2026-03-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "k1l3m5n6o7p8"
down_revision = "j0k2l4m5n6o7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quiz_sessions",
        sa.Column(
            "minigame_type",
            sa.String(50),
            nullable=False,
            server_default="tap_sprint",
        ),
    )


def downgrade() -> None:
    op.drop_column("quiz_sessions", "minigame_type")
