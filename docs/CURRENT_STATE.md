# Current State

## Repository Structure (Observed)
- `backend/`: FastAPI app, SQLAlchemy models, Alembic migration, Celery worker, importers.
- `frontend/`: Next.js 15 app with a small set of pages/components.
- `docker-compose.yml`: local multi-service stack.
- `ARCHITECTURE_SPEC.md`: intended architecture (broader than implemented code).
- `docs/`: authoritative implementation snapshot docs (this deliverable).

## Backend Modules Present
### Application Core
- `src/main.py`: app factory + router registration.
- `src/config.py`: settings from `.env`.
- `src/database.py`: async SQLAlchemy engine/session.
- `src/dependencies.py`: DB dependency + mocked `get_current_user`.
- `src/middleware.py`: request ID + structured logs + CORS.
- `src/exceptions.py`: common app exceptions and global handlers.

### Routers currently registered
- `health` (`/api/v1/health/*`)
- `quizzes` (`/api/v1/quizzes*`)
- `questions` (`/api/v1/quizzes/{quiz_id}/questions*`)
- `imports` (`/api/v1/import*`)

> Not registered/absent despite model groundwork: `auth`, `play`, `attempts`, `analytics`.

### Services implemented
- `quiz_service.py`
- `question_service.py`
- `import_service.py`

### Models implemented
- `users`, `quizzes`, `questions`, `attempts`, `answers`, `import_jobs`, `quiz_analytics`.

### Worker/import subsystem
- Celery app config in `workers/celery_app.py`.
- Import task in `workers/import_tasks.py`.
- Importer strategy factory + format-specific parsers (`csv`, `xlsx`, `docx`, `pdf`).

## Frontend Routes/Components Present
### Existing routes
- `/` — simple landing page with link to dashboard.
- `/quizzes` — creator dashboard list + “create quiz”.
- `/quizzes/[id]/edit` — editor for quiz metadata and questions.

### Major components
- `components/editor/QuestionForm.tsx` — dynamic question form with preview mode.
- `lib/api-client.ts` — thin fetch wrapper to `/api/v1`.

### Current frontend state pattern
- Local component state (`useState`, `useEffect`) + direct API calls.
- No central store (despite architecture spec mentioning Zustand).
- No server actions or React Query style caching layer.

## Current API Areas
### Implemented
- Health checks: app, DB, Redis.
- Quiz CRUD subset: create/list/get/update + publish endpoint.
- Question CRUD subset under quiz.
- Import upload/status/confirm/delete.

### Missing from intended product scope
- Public quiz fetch by slug.
- Attempt start/submit/result endpoints.
- Analytics endpoints.
- Auth/login/token management endpoints.

## Database Entities/Tables
Initial migration creates all core tables and indexes in one revision:
- `users`
- `quizzes`
- `questions`
- `attempts`
- `answers`
- `import_jobs`
- `quiz_analytics`

No follow-up migrations exist yet.

## Working vs Partial Status
### Fully working (within current scope)
- Quiz draft lifecycle and question editing from UI to API.
- Publish guard requiring at least one question.
- Import job creation + worker processing + confirm flow.
- Health endpoints and local compose wiring.

### Partial / fragile / mocked
- Auth is mocked with a static admin user auto-created on demand.
- Import delete allows deleting completed jobs (questionable policy).
- Question positions in import-confirm path start from 0, whereas manual creation starts from 1.
- Import base class signature says `file_path: str`, while implementations accept `str | IO`.
- Frontend depends on `lucide-react` and `react-hook-form`, but they are not listed in `frontend/package.json`.
- Root layout metadata and frontend README still reflect scaffold defaults.

### Missing
- Runtime play experience.
- Attempt grading and persisted answer workflow.
- Analytics calculations and dashboard UI.
- End-to-end tests.
