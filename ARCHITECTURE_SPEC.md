# Quizik — Architecture Specification

> **Source of truth for all development.** No code should contradict this document.
> Last updated: 2026-03-12

---

## 1. System Overview

Quizik is a quiz creation, sharing, and analytics platform. Authors import or build quizzes, share them via link, participants take quizzes without login, and results are stored with full statistics.

```
Browser
  └─► Next.js (SSR + CSR) :3000
        └─► /api/* rewrite ──► FastAPI :8000
                                  ├─► PostgreSQL :5432
                                  ├─► Redis :6379  (Celery broker)
                                  └─► /data/uploads (local volume)
                              Celery Worker
                                  ├─► PostgreSQL
                                  ├─► Redis
                                  └─► /data/uploads
```

**Tech stack:** Next.js 15 · TypeScript · Tailwind CSS · FastAPI · Python 3.12 · PostgreSQL 16 · Redis 7 · Celery · Docker

---

## 2. Monorepo Structure

```
quizik/
├── ARCHITECTURE_SPEC.md
├── docker-compose.yml                  # dev: 5 services + mailhog
├── docker-compose.prod.yml             # prod: adds nginx
├── .env.example
├── Makefile
│
├── frontend/                           # Next.js
│   ├── Dockerfile
│   ├── next.config.ts                  # /api rewrite → backend:8000
│   ├── tailwind.config.ts
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── (auth)/                 # /login, /register, /forgot-password
│       │   ├── (dashboard)/            # /dashboard, /quizzes
│       │   ├── (editor)/              # /quizzes/[id]/edit
│       │   ├── (play)/                # /play/[slug]
│       │   ├── layout.tsx
│       │   └── error.tsx
│       ├── components/
│       │   ├── ui/                     # design system primitives
│       │   ├── quiz/                   # quiz cards, lists
│       │   ├── editor/                 # question builder, option editor
│       │   ├── player/                 # timer, question renderer, results
│       │   ├── analytics/              # charts, stat cards
│       │   └── layout/                 # navbar, sidebar, footer
│       ├── hooks/                      # useAuth, useQuiz, useTimer
│       ├── lib/
│       │   ├── api-client.ts           # typed fetch wrapper
│       │   ├── constants.ts
│       │   └── utils.ts
│       ├── stores/                     # Zustand (auth, editor, player)
│       ├── types/                      # shared TS interfaces
│       └── styles/globals.css
│
├── backend/                            # FastAPI
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_quizzes.py
│   │   ├── test_import.py
│   │   └── test_play.py
│   └── src/
│       ├── main.py                     # app factory, middleware
│       ├── config.py                   # pydantic-settings
│       ├── database.py                 # async engine + session
│       ├── dependencies.py             # get_db, get_current_user
│       ├── exceptions.py               # AppException + global handler
│       ├── middleware.py               # CORS, request ID, logging
│       ├── models/                     # SQLAlchemy ORM
│       │   ├── user.py
│       │   ├── quiz.py
│       │   ├── question.py
│       │   ├── attempt.py
│       │   ├── answer.py
│       │   ├── import_job.py
│       │   └── quiz_analytics.py
│       ├── schemas/                    # Pydantic v2 request/response
│       ├── routers/
│       │   ├── auth.py
│       │   ├── quizzes.py
│       │   ├── questions.py
│       │   ├── play.py
│       │   ├── imports.py
│       │   ├── analytics.py
│       │   └── health.py
│       ├── services/
│       │   ├── auth_service.py
│       │   ├── quiz_service.py
│       │   ├── play_service.py
│       │   ├── import_service.py
│       │   └── analytics_service.py
│       ├── workers/
│       │   ├── celery_app.py
│       │   └── import_tasks.py
│       ├── importers/
│       │   ├── base.py                 # BaseImporter ABC
│       │   ├── xlsx_importer.py        # openpyxl
│       │   ├── csv_importer.py         # stdlib csv
│       │   ├── docx_importer.py        # python-docx
│       │   └── pdf_importer.py         # pdfplumber (Phase 4)
│       └── utils/
│           ├── security.py             # bcrypt, JWT encode/decode
│           ├── storage.py              # FileStorage ABC + LocalFileStorage
│           ├── pagination.py
│           └── email.py                # EmailSender ABC + SMTP/Console
│
├── infra/
│   ├── nginx/nginx.conf                # prod only
│   └── templates/
│       └── quiz_import_template.xlsx
│
└── docs/
```

---

## 3. Frontend Architecture

**Framework:** Next.js 15 App Router · TypeScript · Tailwind CSS · Zustand

### Route Groups

| Group | Routes | Purpose |
|---|---|---|
| `(auth)` | `/login`, `/register`, `/forgot-password` | Public auth pages |
| `(dashboard)` | `/dashboard`, `/quizzes` | Authenticated quiz management |
| `(editor)` | `/quizzes/[id]/edit` | Quiz + question editing |
| `(play)` | `/play/[slug]` | Public quiz-taking (no auth required) |

### State Management

| Store | Scope | Contents |
|---|---|---|
| `auth` | Global | Access token (in-memory only), user profile, login state |
| `editor` | Editor page | Current quiz draft, question list, dirty state |
| `player` | Play page | Attempt state, current question index, timer, submitted answers |

### API Communication

- Typed fetch wrapper in `lib/api-client.ts`
- Next.js `rewrites` in `next.config.ts` proxy `/api/*` → `backend:8000`
- Access token sent via `Authorization: Bearer` header
- Refresh token handled via HTTP-only cookie (transparent to frontend)

---

## 4. Backend Architecture

**Framework:** FastAPI · Python 3.12 · SQLAlchemy 2.0 (async) · Pydantic v2

### Layered Architecture

```
Routers  →  Services  →  Models/DB
  │              │            │
  HTTP only      Logic        Schema + queries
  No SQLAlchemy  No FastAPI   No business logic
```

> **Strict rule:** Each layer imports only from the layer below. Workers call services directly.

### Middleware Stack (applied in order)

1. **Request ID** — UUID attached to every request, propagated to logs and Celery tasks
2. **Structured logging** — `structlog` JSON output, includes request ID
3. **CORS** — allows frontend origin from env `FRONTEND_URL`
4. **Global exception handler** — catches `AppException` → standard error JSON

### Error Response Format

```json
{"error": "Human-readable message", "code": "MACHINE_CODE", "details": {}}
```

### Auth Strategy

- Passwords hashed with `bcrypt`
- **Access token:** JWT, 15 min TTL, stored in-memory on frontend (Zustand)
- **Refresh token:** JWT, 7 day TTL, HTTP-only + Secure + SameSite=Strict cookie
- `/auth/refresh` reads cookie → returns new access token

---

## 5. Database Schema

**Engine:** PostgreSQL 16 · Migrations: Alembic · ORM: SQLAlchemy 2.0 async

### Entities

```
users              quizzes             questions
──────             ───────             ─────────
id         PK      id         PK       id          PK
email      UK      author_id  FK→users quiz_id     FK→quizzes
display_name       title               position    smallint
password_hash      description         type        enum
avatar_url         share_slug UK(12)   body        text
is_active          status     enum     explanation text
created_at         settings   JSONB    options     JSONB
updated_at         published_at        points      smallint
                   created_at          created_at
                   updated_at

attempts           answers             import_jobs
────────           ───────             ───────────
id         PK      id         PK       id          PK
quiz_id    FK      attempt_id FK       user_id     FK→users
user_id    FK?     question_id FK      quiz_id     FK? →quizzes
participant_name   response   JSONB    file_name
status     enum    is_correct          file_path
score              points_awarded      status      enum
max_score          time_spent_sec      result      JSONB
percentage                             created_at
time_spent_sec                         completed_at
started_at
completed_at

quiz_analytics
──────────────
id              PK
quiz_id         FK,UK→quizzes
total_attempts
avg_score_pct
avg_time_sec
completion_rate
score_distribution  JSONB
question_stats      JSONB
computed_at
```

### Enums

- **quiz status:** `draft` · `published` · `archived`
- **question type:** `single_choice` · `multiple_choice` · `true_false` · `short_answer`
- **attempt status:** `in_progress` · `completed` · `abandoned`
- **import status:** `pending` · `processing` · `completed` · `failed`

### JSONB Contracts

**`quizzes.settings`**
```json
{
  "time_limit_sec": 600,
  "shuffle_questions": true,
  "shuffle_options": false,
  "show_results": "end",
  "passing_score_pct": 70,
  "allow_anonymous": true,
  "max_attempts_per_ip": 5
}
```

**`questions.options`**
```json
[
  {"id": "a", "text": "Paris", "is_correct": true},
  {"id": "b", "text": "London", "is_correct": false}
]
```

### Indexes

| Table | Columns | Purpose |
|---|---|---|
| `quizzes` | `(author_id, status)` | Dashboard listing |
| `quizzes` | `(share_slug)` UNIQUE | Public quiz lookup |
| `questions` | `(quiz_id, position)` | Ordered fetch |
| `attempts` | `(quiz_id, completed_at)` | Analytics queries |
| `answers` | `(attempt_id)` | Attempt detail |
| `quiz_analytics` | `(quiz_id)` UNIQUE | Upsert target |

### Constraints

| Entity | Limit |
|---|---|
| Questions per quiz | 200 |
| Options per question | 10 |
| Question body | 5000 chars |
| Points per question | 1–100 |
| Share slug | 8-char nanoid, collision-checked |
| Import file | ≤ 10 MB |

---

## 6. Service Boundaries

### Backend Services

| Service | Responsibility | Owns |
|---|---|---|
| **AuthService** | Register, login, JWT lifecycle, password reset | `users` |
| **QuizService** | Quiz + question CRUD, publishing, slug gen, duplication | `quizzes`, `questions` |
| **PlayService** | Attempt creation, answer evaluation, scoring, results | `attempts`, `answers` |
| **ImportService** | Upload validation, Celery dispatch, preview, confirmation | `import_jobs` |
| **AnalyticsService** | Inline aggregation, precomputed stats, CSV export | `quiz_analytics` |

### Frontend Modules

| Module | Route Group | Responsibility |
|---|---|---|
| **Auth** | `(auth)` | Login/register, token management, protected routes |
| **Dashboard** | `(dashboard)` | Quiz list, search, status filters, quick stats |
| **Editor** | `(editor)` | Question builder (4 types), settings, import wizard, preview |
| **Player** | `(play)` | Timer, question rendering, answer submission, results |
| **Analytics** | embedded in dashboard | Charts, attempt tables, export |
| **UI System** | `components/ui/` | Design primitives, toasts, error boundaries |

### Dependency Flow

```
Routers → Services → Models
Workers → Services → Models
Frontend → API Client → Routers
```

No lateral dependencies between services. Shared code goes in `utils/`.

---

## 7. Quiz Generation Pipeline

Authors create quizzes through two paths:

### Path A — Manual Creation (Editor)

```
Create quiz (draft) → Add questions → Configure settings → Publish
```

1. `POST /quizzes` — creates empty draft
2. `POST /quizzes/{id}/questions` — add questions one by one
3. `POST /quizzes/{id}/questions/reorder` — arrange order
4. `PATCH /quizzes/{id}` — set title, description, settings
5. `POST /quizzes/{id}/publish` — validates ≥1 question, generates `share_slug`, sets status to `published`

### Path B — File Import

```
Upload file → Async parse → Preview → Edit → Confirm → Publish
```

1. `POST /import/upload` — enqueue Celery task
2. Worker parses file → stores `ParsedQuestion[]` in `import_jobs.result`
3. `GET /import/jobs/{id}` — frontend polls until `completed`
4. User reviews/edits parsed questions in the editor UI
5. `POST /import/jobs/{id}/confirm` — creates quiz + questions from parsed data
6. Author adjusts and publishes via Path A flow

### Publishing Rules

- Only `draft` → `published` (requires ≥1 question)
- Only `published` → `archived`
- Archived quizzes are read-only, existing share links return "quiz unavailable"

---

## 8. Import Pipeline

### Supported Formats

| Format | Library | Priority | Status |
|---|---|---|---|
| **XLSX** | `openpyxl` | Primary | Phase 3 |
| **CSV** | Python `csv` stdlib | Primary | Phase 3 |
| **DOCX** | `python-docx` | Secondary | Phase 3 |
| **PDF** | `pdfplumber` (text only) | Best-effort | Phase 4 |

### Importer Interface

```
BaseImporter (ABC)
  ├── parse(file_path) → list[ParsedQuestion]
  ├── validate(questions) → ValidationResult
  └── supported_extensions → list[str]

ParsedQuestion:
  ├── body: str
  ├── type: QuestionType
  ├── options: list[{text, is_correct}]
  ├── explanation: str | None
  └── points: int
```

### Expected File Structures

**XLSX / CSV** — one row per question:

| Question | Type | Option A | Option B | Option C | Option D | Correct | Points | Explanation |
|---|---|---|---|---|---|---|---|---|
| Capital of France? | single_choice | Paris | London | Berlin | Madrid | A | 2 | Paris is the capital |

**DOCX** — numbered questions, bulleted options, `*` prefix or bold marks correct answer.

**PDF** — same conventions as DOCX; text-extraction only (no OCR).

A downloadable **template** (`infra/templates/quiz_import_template.xlsx`) is provided for users.

### Pipeline Flow

```
Upload → Validate (type, size ≤ 10MB, magic bytes)
  → Save to /data/uploads/{user_id}/{job_id}.{ext}
  → Create import_job (pending)
  → Enqueue Celery task
  → Worker: download file → detect importer → parse → validate
  → Store parsed preview in import_job.result (JSON)
  → User reviews in editor UI → confirm or edit → create quiz
```

### Error Handling

- Malformed rows/paragraphs → skip with warning, include in `result.warnings[]`
- Zero parseable questions → job status `failed`, error in `result.error`
- Worker crash → 3 retries with exponential backoff, then `failed`

---

## 9. Quiz Runtime Engine

### Participant Flow

```
GET  /play/{slug}         → quiz meta (title, count, time limit)
POST /play/{slug}/start   → {attempt_id, questions[]} (no correct answers)
POST /play/{slug}/answer  → {attempt_id, question_id, response} → ack
POST /play/{slug}/finish  → {attempt_id} → {score, max_score, percentage, breakdown[]}
```

### Scoring Rules

- **single_choice / true_false:** full points if correct, 0 otherwise
- **multiple_choice:** full points if all correct options selected, 0 otherwise (no partial credit by default; configurable in `settings`)
- **short_answer:** case-insensitive exact match, trimmed

### Runtime Behaviors

| Feature | Implementation |
|---|---|
| **Timer** | Frontend countdown. Backend validates `finish_time - start_time ≤ time_limit + 30s grace`. Overdue → auto-score submitted answers. |
| **Shuffle** | Server generates seeded permutation (`seed = attempt_id`) for question and option order. Deterministic, not stored. |
| **Show results** | `"immediate"` (per-question), `"end"` (on finish), or `"never"`. Controlled by `quizzes.settings.show_results`. |
| **Anonymous play** | `user_id` nullable on `attempts`. `participant_name` collected on `/start`. |
| **Rate limiting** | Redis sliding window on `/play/{slug}/start`. Max attempts per IP from `settings.max_attempts_per_ip`. |
| **Resumability** | In-progress attempts resumable within time limit by re-calling `/start` with same IP + name. |

### Answer Evaluation

On each `/answer` call, the backend:
1. Loads the question from PostgreSQL (single-row lookup by PK, <5ms)
2. Compares `response` against `options[].is_correct`
3. Inserts `answers` row with `is_correct` and `points_awarded`
4. Returns ack (or correctness if `show_results = "immediate"`)

On `/finish`:
1. Sums `points_awarded` from all `answers` for this attempt
2. Updates `attempt` with `score`, `max_score`, `percentage`, `status = completed`
3. Triggers inline analytics recomputation

---

## 10. Analytics Architecture

### Computation Strategy

Analytics are computed **inline** (synchronously) after each attempt completion. No background worker needed.

```
POST /play/{slug}/finish
  → score attempt
  → UPDATE attempt SET status='completed'
  → UPSERT quiz_analytics (recompute aggregates)
  → return results to participant
```

### Aggregation Query

```sql
SELECT
  COUNT(*)                                              AS total_attempts,
  AVG(percentage)                                       AS avg_score_pct,
  AVG(time_spent_sec)                                   AS avg_time_sec,
  COUNT(*) FILTER (WHERE status='completed')::float
    / NULLIF(COUNT(*), 0)                               AS completion_rate
FROM attempts
WHERE quiz_id = $1 AND status IN ('completed','abandoned');
```

Upserted via `ON CONFLICT (quiz_id) DO UPDATE`.

### Exposed Metrics

| Endpoint | Returns |
|---|---|
| `GET /analytics/summary` | total attempts, avg score, avg time, completion rate, score distribution histogram |
| `GET /analytics/attempts` | paginated attempt list (name, score, time, date) |
| `GET /analytics/attempts/{id}` | single attempt detail with per-question answers |
| `GET /analytics/questions` | per-question accuracy and avg time |
| `GET /analytics/export` | CSV download of all attempts |

### Future Optimization

When any single quiz exceeds ~50k attempts and the aggregation query takes >200ms, add Redis caching with 5 min TTL. **Do not add before profiling proves the need.**

---

## 11. Background Job Processing

Only **file import** uses background processing. All other operations are synchronous.

### Infrastructure

| Component | Config |
|---|---|
| Broker | `redis://redis:6379/0` |
| Result backend | `redis://redis:6379/1` |
| Concurrency | 2 workers |
| Task time limit | 300 seconds |
| Retry policy | 3 attempts, exponential backoff |

### Job Lifecycle

```
pending → processing → completed → (user confirms → quiz created)
                    ↘ failed (retryable or terminal)
```

- Job status polled via `GET /import/jobs/{job_id}`
- Parsed preview stored in `import_jobs.result` as JSON
- Raw uploaded file retained until job is confirmed or discarded

### Docker Compose

```yaml
services:
  frontend:    # Next.js :3000 (rewrites /api → backend)
  backend:     # FastAPI :8000 (uvicorn --reload)
  worker:      # Celery worker (same image as backend)
  postgres:    # PostgreSQL 16, volume: pgdata
  redis:       # Redis 7 Alpine
  mailhog:     # Dev email capture :8025
```

Production adds `nginx` as reverse proxy.

---

## 12. Key Design Principles

### Simplicity First
- No service is added until a concrete need is proven (no MinIO, no analytics workers, no Nginx in dev).
- JSONB for semi-structured data (`options`, `settings`) — avoids unnecessary join tables.

### Strict Layer Separation
- **Routers:** HTTP concerns only. Never import SQLAlchemy.
- **Services:** Business logic and validation. Never import FastAPI.
- **Models:** Schema and queries. No business logic.
- **Workers:** Call services. Never access routers.
- No lateral dependencies between services. Shared utilities go in `utils/`.

### Security by Default
- JWT refresh via HTTP-only cookie — never in localStorage.
- Server-side magic byte validation on file uploads.
- Input sanitization (`bleach`) on user-submitted text.
- Rate limiting on all public endpoints via Redis sliding window.

### Scalability Through Simplicity
- Stateless API — horizontal scaling via container replicas.
- Async SQLAlchemy — non-blocking DB access.
- Background jobs only where truly needed (file parsing).
- Analytics precomputed inline — no stale data, no worker complexity.
- S3-compatible storage interface ready for swap when needed.

### Maintainability
- Single source of truth (this document).
- Typed across the stack: TypeScript frontend, Pydantic + SQLAlchemy backend.
- Standard error format across all endpoints.
- Structured logging with request ID propagation.
- Test infrastructure from Phase 1 (`pytest`, `vitest`, `Playwright`).

---

## API Quick Reference

All endpoints prefixed with `/api/v1`.

| Group | Key Endpoints | Auth |
|---|---|---|
| **Auth** | `POST /register`, `POST /login`, `POST /refresh`, `GET /me` | Public / JWT |
| **Quizzes** | `CRUD /quizzes`, `POST /{id}/publish`, `POST /{id}/duplicate` | JWT + Owner |
| **Questions** | `CRUD /quizzes/{id}/questions`, `POST /reorder` | JWT + Owner |
| **Import** | `POST /upload`, `GET /jobs/{id}`, `POST /jobs/{id}/confirm` | JWT |
| **Play** | `GET /{slug}`, `POST /start`, `POST /answer`, `POST /finish` | Public |
| **Analytics** | `GET /summary`, `GET /attempts`, `GET /questions`, `GET /export` | JWT + Owner |
| **Health** | `GET /health`, `GET /health/db`, `GET /health/redis` | Public |

---

## Development Phases

| Phase | Weeks | Scope |
|---|---|---|
| **1 — Foundation** | 1–3 | Docker, DB, auth, app shell, quiz CRUD |
| **2 — Quiz Flow** | 4–6 | Editor, publishing, player runtime, scoring, analytics |
| **3 — Import** | 7–9 | XLSX/CSV/DOCX import, review UI, rate limiting, CSV export |
| **4 — Hardening** | 10–12 | Tests, PDF import, performance tuning, prod builds |
