# Domain Model Proposal — Next Phase

This proposal defines an MVP-friendly evolution of the current model, preserving compatibility with existing quiz flows.

## Design Goals
- Clear ownership and publication boundaries.
- Session-scoped runtime and leaderboard isolation.
- Auditable review and moderation.
- Optional gamification and telemetry.

## Core Entities

## 1) User
Represents authenticated teacher/admin accounts (participant accounts optional later).

Key fields:
- `id`, `email`, `display_name`, auth credentials/metadata.

## 2) OwnerScope (optional early)
A future-ready abstraction for user-owned vs workspace-owned resources.

MVP path:
- Start with user ownership only.
- Introduce workspace scope later as additive.

## 3) QuizTemplate
Editable source quiz owned by a user/scope.

Key fields:
- `id`, `owner_id`, `title`, `description`, `status`, default settings.
- `source_template_id` (nullable, for clone lineage).

Notes:
- Template contains latest editable draft state.

## 4) QuizVersion
Immutable snapshot of template at publish/save-point.

Key fields:
- `id`, `template_id`, `version_no`, `snapshot_payload`, `created_by`, `created_at`.

Notes:
- Prevents historical drift for sessions and analytics reproducibility.

## 5) QuizSession
A published runtime context from one version.

Key fields:
- `id`, `template_id`, `version_id`, `share_slug` (or join token),
- `starts_at`, `ends_at`, `is_open_ended`,
- `leaderboard_enabled`, `gamification_enabled`,
- session-level behavior overrides.

Notes:
- Leaderboard and attempts belong to session.

## 6) SessionAccess / ShareLink
Optional table for access rules.

Examples:
- public anonymous,
- class code required,
- restricted allow-list.

## 7) Attempt
Participant run in a single session.

Key fields:
- `id`, `session_id`, `participant_name`, `status`,
- `knowledge_score`, `max_knowledge_score`,
- `engagement_score` (optional),
- timing fields.

## 8) AttemptAnswer
Answer per question in an attempt.

Key fields:
- `attempt_id`, `question_ref`, `response`,
- `auto_grade_result`, `manual_grade_override`,
- `final_points_awarded`.

## 9) LeaderboardEntry
Session-scoped ranking projection.

Key fields:
- `session_id`, `attempt_id`, `display_name`, `rank`,
- `knowledge_score`, optional `engagement_score`, `submitted_at`.

Notes:
- Can be computed on demand or materialized for speed.

## 10) ManualReview
Audit trail for teacher scoring adjustments and moderation.

Key fields:
- `id`, `attempt_id`, `answer_id` (optional),
- `action_type` (score_adjust/remove_entry/note),
- `before_value`, `after_value`, `reason`, `reviewer_user_id`, `created_at`.

## 11) GamificationConfig
Session-level optional config.

Key fields:
- `session_id`, `enabled`, `trigger_rules`, `reward_policy`, `minigame_pool`.

## 12) MinigameDefinition
Catalog of safe, lightweight minigame modules.

Key fields:
- `id`, `slug`, `name`, `interaction_mode` (touch/pointer/keyboard),
- `difficulty_profile`, `feature_flag`.

## 13) AntiCheatEvent / AttemptTelemetry
Raw telemetry event stream linked to attempt.

Key fields:
- `id`, `attempt_id`, `event_type`, `event_ts`, `payload_json`.

Example events:
- `visibility_hidden`, `visibility_visible`, `idle_warning`, `answer_burst_pattern`.

## Relationship Summary
- One `User` owns many `QuizTemplate`.
- One `QuizTemplate` has many `QuizVersion`.
- One `QuizVersion` can spawn many `QuizSession`.
- One `QuizSession` has many `Attempt` and leaderboard entries.
- One `Attempt` has many `AttemptAnswer` and telemetry events.
- `ManualReview` references attempts/answers and actor user.

## Lifecycle Summary
1. Teacher edits template.
2. System creates version snapshot on publish.
3. Teacher opens session from version.
4. Participants submit attempts into that session.
5. Auto-grade + optional manual review finalize scores.
6. Session leaderboard reflects finalized scoring policy.

## Ownership and Boundary Rules
- Editing rights are template-level (owner/editor).
- Runtime actions (moderation/leaderboard) are session-level.
- Attempts are immutable records except explicit review adjustments (always audited).

## MVP-Friendly Implementation Notes
- Keep current `quizzes` table initially; migrate progressively toward template/version/session with compatibility views/bridges.
- Avoid introducing extra services; remain in current FastAPI + Postgres + Celery monolith.
- Use JSONB for flexible config (gamification rules, telemetry payload) where schema churn is expected.
- Keep minigames behind feature flags until accessibility and stability baselines are met.
