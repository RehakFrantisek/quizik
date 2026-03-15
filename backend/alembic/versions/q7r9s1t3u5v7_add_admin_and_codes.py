"""add admin role, invitation codes, and login logs

Revision ID: q7r9s1t3u5v7
Revises: p6q8r0s2t4u5
Create Date: 2026-03-15 12:00:00.000000

"""
from collections.abc import Sequence
import uuid
from alembic import op
import sqlalchemy as sa

revision: str = "q7r9s1t3u5v7"
down_revision: str | None = "p6q8r0s2t4u5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create invitation_codes table
    op.create_table(
        "invitation_codes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("created_by_id", sa.UUID(), nullable=False),
        sa.Column("used_by_id", sa.UUID(), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["used_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invitation_codes_code", "invitation_codes", ["code"], unique=True)

    # Create user_login_logs table
    op.create_table(
        "user_login_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_login_logs_user_id", "user_login_logs", ["user_id"])
    op.create_index("ix_user_login_logs_created_at", "user_login_logs", ["created_at"])

    # Set fanda.rehak1@gmail.com to admin role (if user exists)
    op.execute("""
        UPDATE users SET role = 'admin' WHERE email = 'fanda.rehak1@gmail.com'
    """)


def downgrade() -> None:
    op.drop_index("ix_user_login_logs_created_at", "user_login_logs")
    op.drop_index("ix_user_login_logs_user_id", "user_login_logs")
    op.drop_table("user_login_logs")
    op.drop_index("ix_invitation_codes_code", "invitation_codes")
    op.drop_table("invitation_codes")
