"""add cover_image_url to quizzes

Revision ID: u1v2w3x4y5z6
Revises: f6g8b0d1c3e5
Create Date: 2026-04-02 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "u1v2w3x4y5z6"
down_revision: Union[str, None] = "s9t1u3v5w7x9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("quizzes", sa.Column("cover_image_url", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("quizzes", "cover_image_url")
