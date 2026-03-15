"""Add minigame_score to attempts.

Revision ID: h8i0j2k3l4m5
Revises: g7h9i1j2k3l4
Create Date: 2026-03-15

"""
from alembic import op
import sqlalchemy as sa

revision = "h8i0j2k3l4m5"
down_revision = "g7h9i1j2k3l4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "attempts",
        sa.Column("minigame_score", sa.SmallInteger(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("attempts", "minigame_score")
