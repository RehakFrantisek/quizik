"""Enable RLS on all public tables to block direct PostgREST access

Revision ID: w3x4y5z6a7b8
Revises: v2w3x4y5z6a7
Create Date: 2026-05-10 00:00:00.000000

Why: Supabase exposes all public-schema tables via PostgREST. Without RLS
any unauthenticated client can read/write data directly. The FastAPI backend
is the only intended access path — all other access must be blocked.

Strategy:
- Enable RLS on every table (no permissive policies added → default-deny for
  anon / authenticated PostgREST roles).
- Grant BYPASSRLS to the app DB user so FastAPI connections are unaffected.
"""

from typing import Sequence, Union
from alembic import op


revision: str = "w3x4y5z6a7b8"
down_revision: Union[str, None] = "v2w3x4y5z6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# All tables in the public schema that need RLS protection.
# alembic_version is internal but also exposed, so lock it down too.
TABLES = [
    "users",
    "quizzes",
    "questions",
    "quiz_sessions",
    "attempts",
    "answers",
    "groups",
    "telemetry_events",
    "import_jobs",
    "quiz_analytics",
    "invitation_codes",
    "user_login_logs",
    "alembic_version",
]

def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;')

    # Grant BYPASSRLS to whatever DB user is running migrations (works on
    # both Supabase and Render without hardcoding the role name).
    op.execute("DO $$ BEGIN EXECUTE 'ALTER ROLE ' || current_user || ' BYPASSRLS'; END $$;")


def downgrade() -> None:
    op.execute("DO $$ BEGIN EXECUTE 'ALTER ROLE ' || current_user || ' NOBYPASSRLS'; END $$;")

    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY;')
