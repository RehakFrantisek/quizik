"""Phase 2: real auth, quiz sessions, fuzzy answers

Revision ID: b2c4e8f1a3d5
Revises: 27d6ae90aac3
Create Date: 2026-03-14 00:00:00.000000

Changes:
- users: add role column
- quizzes: add clone_of_id column
- questions: add accepted_answers JSONB column
- quiz_sessions: new table
- attempts: add session_id FK, hidden_from_leaderboard
- answers: add override columns (points_override, override_by_id, override_at, override_reason)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'b2c4e8f1a3d5'
down_revision: Union[str, None] = '27d6ae90aac3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users: add role ──
    op.add_column('users', sa.Column('role', sa.String(length=50), nullable=False, server_default='teacher'))

    # ── quizzes: add clone_of_id ──
    op.add_column('quizzes', sa.Column('clone_of_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_quizzes_clone_of_id', 'quizzes', 'quizzes',
        ['clone_of_id'], ['id'], ondelete='SET NULL'
    )

    # ── questions: add accepted_answers ──
    op.add_column('questions', sa.Column(
        'accepted_answers', postgresql.JSONB(astext_type=sa.Text()), nullable=True
    ))

    # ── quiz_sessions: new table ──
    op.create_table(
        'quiz_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('quiz_id', sa.Uuid(), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('session_slug', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('leaderboard_enabled', sa.Boolean(), nullable=False),
        sa.Column('gamification_enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_quiz_sessions_owner_id'), 'quiz_sessions', ['owner_id'], unique=False)
    op.create_index(op.f('ix_quiz_sessions_quiz_id'), 'quiz_sessions', ['quiz_id'], unique=False)
    op.create_index(op.f('ix_quiz_sessions_session_slug'), 'quiz_sessions', ['session_slug'], unique=True)
    op.create_index('ix_quiz_sessions_owner_id_status', 'quiz_sessions', ['owner_id', 'status'], unique=False)

    # ── attempts: add session_id, hidden_from_leaderboard ──
    op.add_column('attempts', sa.Column('session_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(
        'fk_attempts_session_id', 'attempts', 'quiz_sessions',
        ['session_id'], ['id'], ondelete='CASCADE'
    )
    op.create_index(op.f('ix_attempts_session_id'), 'attempts', ['session_id'], unique=False)
    op.add_column('attempts', sa.Column('hidden_from_leaderboard', sa.Boolean(), nullable=False, server_default='false'))

    # ── answers: add override columns ──
    op.add_column('answers', sa.Column('points_override', sa.SmallInteger(), nullable=True))
    op.add_column('answers', sa.Column('override_by_id', sa.Uuid(), nullable=True))
    op.add_column('answers', sa.Column('override_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('answers', sa.Column('override_reason', sa.Text(), nullable=True))
    op.create_foreign_key(
        'fk_answers_override_by_id', 'answers', 'users',
        ['override_by_id'], ['id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    # answers
    op.drop_constraint('fk_answers_override_by_id', 'answers', type_='foreignkey')
    op.drop_column('answers', 'override_reason')
    op.drop_column('answers', 'override_at')
    op.drop_column('answers', 'override_by_id')
    op.drop_column('answers', 'points_override')

    # attempts
    op.drop_index(op.f('ix_attempts_session_id'), table_name='attempts')
    op.drop_constraint('fk_attempts_session_id', 'attempts', type_='foreignkey')
    op.drop_column('attempts', 'hidden_from_leaderboard')
    op.drop_column('attempts', 'session_id')

    # quiz_sessions
    op.drop_index('ix_quiz_sessions_owner_id_status', table_name='quiz_sessions')
    op.drop_index(op.f('ix_quiz_sessions_session_slug'), table_name='quiz_sessions')
    op.drop_index(op.f('ix_quiz_sessions_quiz_id'), table_name='quiz_sessions')
    op.drop_index(op.f('ix_quiz_sessions_owner_id'), table_name='quiz_sessions')
    op.drop_table('quiz_sessions')

    # questions
    op.drop_column('questions', 'accepted_answers')

    # quizzes
    op.drop_constraint('fk_quizzes_clone_of_id', 'quizzes', type_='foreignkey')
    op.drop_column('quizzes', 'clone_of_id')

    # users
    op.drop_column('users', 'role')
