# ADR 004: Telemetry-Based Anti-Cheat (Risk Signals)

- **Status**: Accepted
- **Date**: 2026-03-14

## Context
Hard anti-cheat enforcement can penalize legitimate participants (device limits, accessibility needs, unstable networks).

## Decision
Collect anti-cheat telemetry as reviewable risk signals, not automatic disqualification rules in MVP.

## Consequences
### Positive
- Lower false-positive harm.
- Teachers retain contextual judgment.
- Compatible with iterative analytics improvements.

### Trade-offs
- Requires review UI to be useful.
- Some institutions may later request stricter enforcement options.

## Alternatives considered
- Immediate auto-fail on tab switch (rejected: brittle and unfair).
- No anti-cheat telemetry at all (rejected: no operational insight).
