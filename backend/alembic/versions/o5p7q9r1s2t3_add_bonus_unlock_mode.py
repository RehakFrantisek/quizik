"""add bonus_unlock_mode to quiz_sessions

Revision ID: o5p7q9r1s2t3
Revises: n4o6p8q0r2s3
Create Date: 2026-03-15

"""
from alembic import op
import sqlalchemy as sa

revision = "o5p7q9r1s2t3"
down_revision = "n4o6p8q0r2s3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quiz_sessions",
        sa.Column("bonus_unlock_mode", sa.String(20), nullable=False, server_default="immediate"),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column("bonus_unlock_x", sa.Integer(), nullable=False, server_default="3"),
    )


def downgrade() -> None:
    op.drop_column("quiz_sessions", "bonus_unlock_x")
    op.drop_column("quiz_sessions", "bonus_unlock_mode")
