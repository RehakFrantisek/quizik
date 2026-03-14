# Database Schema

## Migration Status
- Alembic has a **single initial migration** (`27d6ae90aac3_initial_schema.py`) creating all current tables.
- No subsequent migrations are present.

## Entity Catalog

## `users`
Key fields:
- `id` (UUID PK)
- `email` (unique, indexed)
- `display_name`
- `password_hash`
- `avatar_url`
- `is_active`
- `created_at`, `updated_at`

Relationships:
- 1:N with `quizzes`
- 1:N with `attempts`
- 1:N with `import_jobs`

## `quizzes`
Key fields:
- `id` (UUID PK)
- `author_id` (FK → users)
- `title`, `description`
- `share_slug` (unique, nullable)
- `status` (`draft|published|archived` by convention)
- `settings` (JSONB)
- `published_at`, `created_at`, `updated_at`

Relationships:
- N:1 with `users`
- 1:N with `questions`
- 1:N with `attempts`
- 1:1 with `quiz_analytics`

Indexes:
- `ix_quizzes_author_id`
- `ix_quizzes_share_slug` (unique)
- `ix_quizzes_author_id_status`

## `questions`
Key fields:
- `id` (UUID PK)
- `quiz_id` (FK → quizzes)
- `position` (smallint)
- `type` (`single_choice|multiple_choice|true_false|short_answer` by schema validation)
- `body`, `explanation`
- `options` (JSONB list of option objects)
- `points`
- `created_at`

Relationships:
- N:1 with `quizzes`
- 1:N with `answers`

Index:
- `ix_questions_quiz_id_position`

## `attempts`
Key fields:
- `id` (UUID PK)
- `quiz_id` (FK → quizzes)
- `user_id` (nullable FK → users, `SET NULL`)
- `participant_name`
- `status` (`in_progress|completed|abandoned` by convention)
- `score`, `max_score`, `percentage`, `time_spent_sec`
- `started_at`, `completed_at`

Relationships:
- N:1 with `quizzes`
- N:1 with `users` (optional)
- 1:N with `answers`

Index:
- `ix_attempts_quiz_id_completed_at`

## `answers`
Key fields:
- `id` (UUID PK)
- `attempt_id` (FK → attempts)
- `question_id` (FK → questions)
- `response` (JSONB; dict/list/string semantics)
- `is_correct`
- `points_awarded`
- `time_spent_sec`

Relationships:
- N:1 with `attempts`
- N:1 with `questions`

Indexes:
- `ix_answers_attempt_id`
- `ix_answers_question_id`

## `import_jobs`
Key fields:
- `id` (UUID PK)
- `user_id` (FK → users)
- `quiz_id` (nullable FK → quizzes after confirm)
- `file_name`, `file_path`
- `status` (`pending|processing|completed|failed` by convention)
- `result` (JSONB import preview + warnings/errors)
- `created_at`, `completed_at`

Relationships:
- N:1 with `users`
- optional N:1 with `quizzes`

Index:
- `ix_import_jobs_user_id_status`

## `quiz_analytics`
Key fields:
- `id` (UUID PK)
- `quiz_id` (unique FK → quizzes)
- `total_attempts`, `avg_score_pct`, `avg_time_sec`, `completion_rate`
- `score_distribution` (JSONB)
- `question_stats` (JSONB)
- `computed_at`

Relationships:
- 1:1 with `quizzes`

## JSON/JSONB Usage Summary
- `quizzes.settings`: configurable runtime settings blob.
- `questions.options`: option arrays with correctness flags.
- `answers.response`: flexible participant response shape.
- `import_jobs.result`: parser output + warnings/errors.
- `quiz_analytics.score_distribution`, `quiz_analytics.question_stats`: aggregated metrics blobs.

## Denormalized/Pragmatic Choices
- Option data stored inline in `questions.options` instead of normalized `question_options` table.
- Analytics aggregates pre-structured as JSONB for fast retrieval and loose schema evolution.
- Import preview stored directly on job row, avoiding a separate preview table.

## Known Schema/Consistency Notes
- Model set includes attempts/answers/analytics tables, but runtime APIs using them are not yet implemented.
- `Question.position` is not currently constrained unique per quiz (enforced only by service behavior).
- Import confirm currently writes question positions starting at `0`, while manual authoring starts from `1`.
