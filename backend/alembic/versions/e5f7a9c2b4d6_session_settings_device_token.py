"""Add allow_repeat, show_correct_answer to sessions; device_token to attempts

Revision ID: e5f7a9c2b4d6
Revises: d4e6f8a2b1c3
Create Date: 2026-03-14 21:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f7a9c2b4d6"
down_revision: Union[str, None] = "d4e6f8a2b1c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "quiz_sessions",
        sa.Column("allow_repeat", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "quiz_sessions",
        sa.Column("show_correct_answer", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "attempts",
        sa.Column("device_token", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("attempts", "device_token")
    op.drop_column("quiz_sessions", "show_correct_answer")
    op.drop_column("quiz_sessions", "allow_repeat")
