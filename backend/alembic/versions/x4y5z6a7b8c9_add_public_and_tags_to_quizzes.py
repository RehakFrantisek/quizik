"""add is_public and tags to quizzes

Revision ID: x4y5z6a7b8c9
Revises: w3x4y5z6a7b8
Create Date: 2026-05-10 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "x4y5z6a7b8c9"
down_revision: Union[str, None] = "w3x4y5z6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "quizzes",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "quizzes",
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.String(length=100)),
            nullable=True,
            server_default="{}",
        ),
    )
    op.create_index(
        "ix_quizzes_tags_gin",
        "quizzes",
        ["tags"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_quizzes_is_public",
        "quizzes",
        ["is_public"],
    )


def downgrade() -> None:
    op.drop_index("ix_quizzes_is_public", table_name="quizzes")
    op.drop_index("ix_quizzes_tags_gin", table_name="quizzes")
    op.drop_column("quizzes", "tags")
    op.drop_column("quizzes", "is_public")
