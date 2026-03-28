"""Add session play_mode field.

Revision ID: s9t1u3v5w7x9
Revises: r8s0t2u4v6w8
Create Date: 2026-03-28 00:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "s9t1u3v5w7x9"
down_revision: Union[str, None] = "r8s0t2u4v6w8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "quiz_sessions",
        sa.Column("play_mode", sa.String(length=30), nullable=False, server_default="quiz"),
    )


def downgrade() -> None:
    op.drop_column("quiz_sessions", "play_mode")
