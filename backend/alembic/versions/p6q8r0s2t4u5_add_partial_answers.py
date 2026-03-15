"""add partial_answers to attempts

Revision ID: p6q8r0s2t4u5
Revises: o5p7q9r1s2t3
Create Date: 2026-03-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "p6q8r0s2t4u5"
down_revision = "o5p7q9r1s2t3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attempts", sa.Column("partial_answers", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("attempts", "partial_answers")
