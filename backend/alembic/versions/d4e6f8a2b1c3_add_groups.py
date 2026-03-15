"""Add groups table and group_id to quiz_sessions

Revision ID: d4e6f8a2b1c3
Revises: b2c4e8f1a3d5
Create Date: 2026-03-14 20:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e6f8a2b1c3"
down_revision: Union[str, None] = "b2c4e8f1a3d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_groups_owner_id", "groups", ["owner_id"], unique=False)

    op.add_column(
        "quiz_sessions",
        sa.Column("group_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_quiz_sessions_group_id",
        "quiz_sessions",
        "groups",
        ["group_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_quiz_sessions_group_id", "quiz_sessions", ["group_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_quiz_sessions_group_id", table_name="quiz_sessions")
    op.drop_constraint("fk_quiz_sessions_group_id", "quiz_sessions", type_="foreignkey")
    op.drop_column("quiz_sessions", "group_id")
    op.drop_index("ix_groups_owner_id", table_name="groups")
    op.drop_table("groups")
