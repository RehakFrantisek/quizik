# Quizik Gamification and Classroom Model

## Purpose
This document defines the **next product/architecture direction** for Quizik: evolving from a single-admin MVP into a multi-user, classroom-oriented platform while preserving a simple implementation path.

## Canonical Domain Terms
Use these terms consistently in code/docs/UI:

- **QuizTemplate**: the teacher-owned base quiz definition (title, questions, settings defaults).
- **QuizClone**: a new teacher-owned template copied from another template (independent lifecycle).
- **QuizVersion**: an immutable snapshot of a template at publish time (or explicit save-point) used for reproducibility.
- **QuizSession**: a concrete published run (share link/access window/rules/leaderboard scope) tied to one template version.
- **Attempt**: one participant run against one session.

## Product Vision
- Keep Quizik an easy-to-use quiz platform, not a full LMS.
- Support public links and classroom scenarios in parallel.
- Make gamification optional and teacher-controlled.
- Preserve clean separation between academic evaluation and game engagement.

## Classroom Workflows

### Workflow A: Teacher creates and runs quiz
1. Teacher creates `QuizTemplate` (e.g., "History 3.A").
2. Teacher publishes a `QuizSession` from a specific `QuizVersion`.
3. Students join through share link/code and submit attempts.
4. Teacher reviews leaderboard and attempt details.

### Workflow B: Teacher clones and adapts another teacher's quiz
1. Teacher opens a shared template or catalog item.
2. Teacher creates `QuizClone` (e.g., rename to "History 3.B").
3. Clone is fully editable and independently publishable.
4. Any sessions/leaderboards belong to the clone's own sessions only.

### Workflow C: Open-answer review and score correction
1. Attempt auto-graded where safe.
2. Open answers flagged for review (or confidence below threshold).
3. Teacher adjusts score/comments.
4. Manual review actions are auditable.

## Ownership Rules
- Every template has an owner scope (initially user; later workspace).
- Only owners/editors can modify template content/settings.
- Cloning creates a **new owner scope** entity; does not transfer ownership.
- Sessions belong to the owner of the source template/version at publish time.

## Editing Rules
- Editing a template does not mutate past sessions.
- Sessions point to immutable version snapshots.
- To use new edits, create a new version/session.

## Leaderboard Separation
Leaderboard scope must be **session-based**:
- same template used in different classes/date windows must not share leaderboard entries,
- cloned templates must have separate leaderboards,
- teacher moderation (remove player, clear board) should target one session only.

## Minigame Strategy
- Minigames are lightweight engagement modules triggered by rules (between questions, streak milestones, or end-of-quiz bonus).
- Default is **disabled**; teacher can enable/disable globally per session.
- Early versions should ship with a small, accessible minigame set.
- Keep minigames independent from grading correctness logic.

## Scoring Model
Use two separate scores:

1. **Knowledge Score** (academic)
   - Derived from quiz questions and grading policy.
   - Drives pass/fail and educational analytics.

2. **Engagement Score** (gamification)
   - Derived from minigames/streaks/bonus mechanics.
   - Optional display; should not overwrite academic result.

Teachers must be able to disable gamification and/or leaderboard entirely per session.

## Moderation and Review Model
- Session-level moderation actions:
  - remove participant entry,
  - clear leaderboard,
  - inspect individual run details.
- Open-answer moderation:
  - manual score adjustments,
  - teacher notes,
  - audit log (`who`, `when`, `before/after`).

## Open-Answer Evaluation Strategy
Layered approach:
1. Normalization (case/whitespace/diacritics/punctuation).
2. Accepted aliases/variants list.
3. Typo-tolerant fuzzy matching (bounded thresholds).
4. Manual review fallback for long/ambiguous answers.

Guideline: long free-text answers should not be blindly trusted to auto-grade.

## Anti-Cheat Telemetry Model
Anti-cheat should be **risk-signal telemetry**, not hard lockout by default.

Recommended signals:
- tab/window visibility changes,
- long inactivity periods,
- suspiciously fast completion patterns,
- abnormal answer timing distributions.

Actions:
- store as session/attempt telemetry,
- compute risk indicators,
- surface to teacher in review UI,
- avoid automatic disqualification in MVP.

## Desktop/Mobile Interaction Principles
- All core flows must be usable with pointer + touch.
- Minigames must support both input modes from first release.
- Avoid interaction patterns requiring hover-only or precise drag-only gestures.

## Accessibility and Fairness
- Provide keyboard-accessible quiz flow and controls.
- Sufficient color contrast and non-color-only correctness cues.
- Respect reduced-motion preferences for game effects.
- Offer “no-gamification” mode for fairness/accessibility-sensitive classrooms.

## Risks and Trade-offs
- **Too much gamification** can reduce educational trust.
- **Too much anti-cheat enforcement** can create false positives.
- **Over-modeling classroom concepts** can overcomplicate MVP.
- **Mitigation**: feature flags, session-level controls, progressive rollout, auditable manual override paths.
