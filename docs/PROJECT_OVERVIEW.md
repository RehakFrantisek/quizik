# Project Overview

## Product Summary
Quizik is currently a quiz authoring and publishing MVP with an in-progress import subsystem. The implemented product center is **creator-side quiz management** (create quiz, edit metadata, add/edit/delete questions, publish quiz), plus health and import APIs. The repository also defines data models for attempts, answers, and analytics, but no runtime/attempt/analytics endpoints are wired yet.

## Product Vision (Intended)
The architecture spec describes Quizik as a full workflow platform:
- Create or import quizzes.
- Publish and share quizzes via slug.
- Let participants complete quizzes without sign-in.
- Grade attempts and present analytics.

## Target Users
- **Primary current user (implemented):** a single mocked admin author (`admin@quizik.local`).
- **Intended future users:** quiz creators (teachers/trainers), anonymous or authenticated participants, and teams managing shared quiz content.

## Main Use Cases
### Implemented now
- Author creates a quiz from dashboard.
- Author edits quiz metadata and question set.
- Author publishes quiz (with validation that at least one question exists).
- Author uploads CSV/XLSX/DOCX/PDF for async parsing preview.
- Author confirms a parsed import into a new draft quiz.

### Intended but not implemented end-to-end
- Public play runtime by `share_slug`.
- Attempt lifecycle (start/submit/abandon) and grading APIs.
- Analytics dashboard fed by completed attempts.
- Real auth (login/register/refresh/logout) and user ownership boundaries beyond the mock user.

## Current Maturity Level
- **Stage:** early MVP / foundation.
- **Strengths:** schema foundation, async backend stack, editor UI, import worker pipeline.
- **Gaps:** frontend route coverage is minimal; many spec-defined modules/routes are absent; tests are scaffold-level only.

## What Is Already Implemented
- Docker Compose local stack with Postgres, Redis, FastAPI API, Celery worker, Next.js frontend, MailHog.
- Alembic initial migration covering core domain entities.
- FastAPI routers for health, quizzes, questions, and imports.
- Services for quiz CRUD, question CRUD, and import upload/confirm/status/delete.
- Importers for CSV/XLSX/DOCX/PDF with parser heuristics and warning collection.
- Next.js App Router pages for `/`, `/quizzes`, `/quizzes/[id]/edit` and a client API wrapper.

## What Is Still Missing
- Play/runtime backend router and frontend route.
- Attempts/answers grading endpoints and persistence flow.
- Analytics computation and API surfaces.
- Strong auth and authorization model.
- Production hardening (security posture, robust validations, non-mock user lifecycle).
- Meaningful automated test coverage across backend and frontend.
