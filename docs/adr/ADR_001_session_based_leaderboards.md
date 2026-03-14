# ADR 001: Session-Based Leaderboards

- **Status**: Accepted
- **Date**: 2026-03-14

## Context
A template may be reused across classes, semesters, and cloned variants. If leaderboard data is tied directly to template, scores from different contexts mix and become unusable for fair classroom comparison.

## Decision
Leaderboard scope is bound to `QuizSession` (published run), not to `QuizTemplate`.

## Consequences
### Positive
- Isolated rankings per class/run.
- Clean moderation operations (`clear`, `remove player`) at session scope.
- Supports same template reused in multiple cohorts.

### Trade-offs
- Requires explicit session entity and migration path from current publish model.

## Alternatives considered
- Template-level leaderboard (rejected: mixes contexts).
- Attempt-only ranking without stored entries (possible later, but still session scoped).
