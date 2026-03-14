# Analytics and Grading

## Executive Snapshot
- The schema includes `attempts`, `answers`, and `quiz_analytics` structures.
- However, no backend router/service currently executes attempt grading or analytics computation.
- As of this snapshot, grading/analytics are **designed in data model**, not implemented in runtime APIs.

## Attempt Lifecycle (Current)
### Intended lifecycle
- start attempt → answer questions → submit/complete → compute score → aggregate analytics.

### Actual implementation state
- No endpoints to start or submit attempts.
- No service methods for attempt progression.
- No frontend participant runtime to generate attempts.
- Therefore, attempt lifecycle is currently non-operational despite table availability.

## Grading Logic by Question Type
### Intended by model constraints
Question types supported by schema:
- `single_choice`
- `multiple_choice`
- `true_false`
- `short_answer`

### Actual implementation
- There is **no active grading function** in repository code that evaluates responses against `questions.options` and writes `answers`/`attempts` scores.
- Existing logic touching question types appears in import parsing only (classification and normalization), not participant grading.

## Analytics Calculations
### Metrics represented in schema
`quiz_analytics` includes:
- `total_attempts`
- `avg_score_pct`
- `avg_time_sec`
- `completion_rate`
- `score_distribution` (JSONB)
- `question_stats` (JSONB)

### Actual computation state
- No analytics service or scheduled computation exists in repo.
- No API endpoint returns analytics data.
- No frontend analytics page exists.

## What Definitely Works Today
- Author-side quiz/question creation and publishing.
- Import parsing that can classify question type and build structured options.

## Limitations / Simplifications
- Analytics and grading functionality is currently conceptual/structural, not executable.
- Any product roadmap references to analytics dashboard should be treated as future work from this baseline.

## Recommended Next Implementation Order
1. Implement attempt start/submit endpoints and answer persistence.
2. Implement deterministic grading engine for all supported question types.
3. Compute per-attempt score outputs and quiz aggregates.
4. Expose analytics APIs and build minimal dashboard UI.
