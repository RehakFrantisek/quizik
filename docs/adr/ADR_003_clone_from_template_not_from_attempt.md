# ADR 003: Clone from Template/Version, Not from Attempt

- **Status**: Accepted
- **Date**: 2026-03-14

## Context
Teachers need to reuse quiz content while keeping participant data private and session history isolated.

## Decision
Cloning produces a new `QuizTemplate` from a source template/version snapshot. Cloning from attempts is not allowed.

## Consequences
### Positive
- Clean ownership transfer semantics.
- No accidental participant data leakage.
- Predictable lineage and edit behavior.

### Trade-offs
- Requires explicit clone flow and lineage metadata.

## Alternatives considered
- Clone from any object including attempts (rejected: privacy and model confusion).
