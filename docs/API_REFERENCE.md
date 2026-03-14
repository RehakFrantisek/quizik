# API Reference (Current Surface)

Base prefix: `/api/v1`

## Notes
- This is a **human-readable snapshot of implemented endpoints**, not a forward-looking contract.
- Auth is currently mocked via dependency injection (`get_current_user`) and not token-based.

## Health / System

### `GET /health/`
- Purpose: simple liveness probe.
- Response: `{ "status": "ok" }`.

### `GET /health/db`
- Purpose: DB connectivity check (`SELECT 1`).
- Response:
  - success: `{ "status": "ok", "service": "postgresql" }`
  - failure: `{ "status": "error", "service": "postgresql", "detail": "..." }`

### `GET /health/redis`
- Purpose: Redis connectivity check (`PING`).
- Response:
  - success: `{ "status": "ok", "service": "redis" }`
  - failure: `{ "status": "error", "service": "redis", "detail": "..." }`

## Quizzes

### `POST /quizzes`
- Purpose: create draft quiz.
- Request (high-level):
  - `title` (required)
  - `description` (optional)
  - `settings` (optional quiz settings object)
- Response: full quiz object including generated `id`, status, settings, timestamps, and `questions`.

### `GET /quizzes`
- Purpose: list quizzes for current (mock) user.
- Response: array of quiz objects.

### `GET /quizzes/{quiz_id}`
- Purpose: fetch quiz with nested questions.
- Response: quiz object.
- Errors:
  - 404 if quiz not found.
  - 403 if owner mismatch.

### `PATCH /quizzes/{quiz_id}`
- Purpose: update title/description/settings/status.
- Request: partial update payload.
- Response: updated quiz object.

### `POST /quizzes/{quiz_id}/publish`
- Purpose: publish a draft.
- Behavior:
  - validates at least one question exists.
  - sets status to `published`.
  - auto-generates `share_slug` if missing.
  - sets `published_at`.
- Response: updated quiz object.

## Questions

### `POST /quizzes/{quiz_id}/questions`
- Purpose: add question to quiz.
- Request:
  - `type`, `body`, optional `explanation`, `points`, `options[]`.
- Response: created question with assigned `position`.

### `PATCH /quizzes/{quiz_id}/questions/{question_id}`
- Purpose: update existing question fields.
- Request: partial question update.
- Response: updated question.

### `DELETE /quizzes/{quiz_id}/questions/{question_id}`
- Purpose: remove question.
- Response: `204 No Content`.

## Publish / Share
- Covered by `POST /quizzes/{quiz_id}/publish`.
- No public endpoint currently exists for resolving quiz by `share_slug`.

## Play / Runtime
- No play endpoints currently implemented.

## Attempts
- No attempt endpoints currently implemented.

## Analytics
- No analytics endpoints currently implemented.

## Import / Upload

### `POST /import/upload`
- Purpose: upload source file and create import job.
- Request: multipart form with `file`.
- Validation:
  - extensions: `.csv`, `.xlsx`, `.docx`, `.pdf`
  - max size: 10 MB
- Response: `{ job_id, status }` with initial `pending`.

### `GET /import/jobs/{job_id}`
- Purpose: poll import job status and parsed preview result.
- Response:
  - `id`, `status`, `file_name`, `result`, `created_at`, `completed_at`
  - `result` may include `parsed_questions[]`, `warnings[]`, `error`.

### `POST /import/jobs/{job_id}/confirm`
- Purpose: convert parsed preview into a new draft quiz.
- Request:
  - `title`, optional `description`
  - finalized `questions[]` payload from review UI
- Response: created quiz entity.

### `DELETE /import/jobs/{job_id}`
- Purpose: delete owned import job.
- Response: `204 No Content`.

## Global Error Shape
`AppException` responses follow:
```json
{ "error": "...", "code": "...", "details": {} }
```

Other `HTTPException` responses (e.g., in import upload endpoint) can return FastAPI default error shape (`detail`), so error format is not yet fully uniform.
