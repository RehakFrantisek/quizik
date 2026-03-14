# ADR 002: Separate Learning Score from Gamification Score

- **Status**: Accepted
- **Date**: 2026-03-14

## Context
Gamification can improve motivation, but academic reliability requires stable, explainable grading.

## Decision
Maintain two distinct score channels:
- `knowledge_score` for quiz learning outcomes.
- `engagement_score` for optional game/minigame mechanics.

## Consequences
### Positive
- Teachers can disable gamification without affecting grading.
- Avoids grade inflation/deflation from non-academic mechanics.
- Improves transparency in analytics.

### Trade-offs
- Additional UI complexity (displaying two metrics).

## Alternatives considered
- Single combined score (rejected: pedagogically ambiguous).
