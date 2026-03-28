"""Add session minigame_config JSON field.

Revision ID: r8s0t2u4v6w8
Revises: q7r9s1t3u5v7
Create Date: 2026-03-28 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "r8s0t2u4v6w8"
down_revision: Union[str, None] = "q7r9s1t3u5v7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("quiz_sessions", sa.Column("minigame_config", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("quiz_sessions", "minigame_config")
