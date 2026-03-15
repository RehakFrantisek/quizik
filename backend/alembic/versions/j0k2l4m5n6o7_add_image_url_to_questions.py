"""Add image_url to questions.

Revision ID: j0k2l4m5n6o7
Revises: i9j1k3l4m5n6
Create Date: 2026-03-15

"""
from alembic import op
import sqlalchemy as sa

revision = "j0k2l4m5n6o7"
down_revision = "i9j1k3l4m5n6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "questions",
        sa.Column("image_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("questions", "image_url")
