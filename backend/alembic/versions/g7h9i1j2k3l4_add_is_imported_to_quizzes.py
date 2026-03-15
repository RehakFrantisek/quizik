"""add is_imported to quizzes

Revision ID: g7h9i1j2k3l4
Revises: f6g8b0d1c3e5
Create Date: 2026-03-14 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "g7h9i1j2k3l4"
down_revision = "f6g8b0d1c3e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quizzes",
        sa.Column("is_imported", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("quizzes", "is_imported")
