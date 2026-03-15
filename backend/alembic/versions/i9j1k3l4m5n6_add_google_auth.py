"""Add google_id to users and make password_hash nullable.

Revision ID: i9j1k3l4m5n6
Revises: h8i0j2k3l4m5
Create Date: 2026-03-15

"""
from alembic import op
import sqlalchemy as sa

revision = "i9j1k3l4m5n6"
down_revision = "h8i0j2k3l4m5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("google_id", sa.String(255), nullable=True),
    )
    op.create_index("ix_users_google_id", "users", ["google_id"])
    op.create_unique_constraint("uq_users_google_id", "users", ["google_id"])
    # Make password_hash nullable to support Google-only accounts
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "password_hash", existing_type=sa.String(255), nullable=False)
    op.drop_constraint("uq_users_google_id", "users", type_="unique")
    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_column("users", "google_id")
