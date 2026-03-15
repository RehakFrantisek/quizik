# Current State — Phase 3 (March 2026)

> Last updated: 2026-03-15 (Phase 4: gamification scoring, Google OAuth, scheduled sessions, QR codes, question images)

---

## Repository Structure (Observed)
- `backend/`: FastAPI app, SQLAlchemy models, Alembic migrations, Celery worker, importers.
- `frontend/`: Next.js 15 app with auth context, quiz dashboard, session management, and play pages.
- `docker-compose.yml`: local multi-service stack.
- `ARCHITECTURE_SPEC.md`: authoritative intended architecture.
- `docs/`: implementation snapshot docs.

---

## Backend Modules Present

### Application Core
- `src/main.py`: app factory + router registration.
- `src/config.py`: settings from `.env`, including auth and Google OAuth vars.
- `src/database.py`: async SQLAlchemy engine/session.
- `src/dependencies.py`: real JWT-based `get_current_user`, plus `get_current_user_optional`.
- `src/middleware.py`: request ID + structured logs + CORS.
- `src/exceptions.py`: common app exceptions and global handlers.

### Routers registered
- `health` (`/api/v1/health/*`)
- `auth` (`/api/v1/auth/*`) — register, login, me
- `quizzes` (`/api/v1/quizzes*`) — CRUD, publish, clone, import-from-slug, share preview
- `questions` (`/api/v1/quizzes/{quiz_id}/questions*`) — CRUD + reorder
- `groups` (`/api/v1/groups*`) — CRUD + sessions-in-group list
- `sessions` (`/api/v1/sessions*`) — CRUD, attempt management, score override
- `play` (`/api/v1/play/*`) — public play, start/submit attempt, telemetry, leaderboard
- `imports` (`/api/v1/import*`)

### Services implemented
- `quiz_service.py`
- `question_service.py`
- `import_service.py`
- `auth_service.py` — password hashing (bcrypt), JWT, register/authenticate
- `session_service.py` — session CRUD, clone quiz (`is_imported` flag), attempt/leaderboard management
- `play_service.py` — public quiz fetch, start/submit attempt, grading, telemetry ingestion
- `evaluation_service.py` — layered answer evaluation (choice/short_answer/fuzzy)

### Utilities
- `utils/fuzzy.py` — normalize + alias + rapidfuzz typo-tolerant matching

### Models implemented
| Table | Notes |
|-------|-------|
| `users` | `role` column (teacher/student) |
| `quizzes` | `clone_of_id` FK, `is_imported` bool (external share vs own clone), `share_slug` |
| `questions` | `accepted_answers` JSONB (alias list for short_answer), `position` |
| `quiz_sessions` | slug, status, time window, leaderboard flag, `allow_repeat`, `show_correct_answer`, `gamification_enabled` |
| `attempts` | `session_id` FK, `device_token` (for repeat-prevention), `hidden_from_leaderboard` |
| `answers` | `points_override`, `override_by_id`, `override_at`, `override_reason` |
| `telemetry_events` | `attempt_id`, `event_type`, `payload` JSONB, `client_ts` |
| `groups` | teacher-owned classroom containers, sessions FK with SET NULL |
| `import_jobs` | unchanged |
| `quiz_analytics` | model present, computation deferred |

### Migrations (in order)
1. `27d6ae90aac3_initial_schema.py`
2. `b2c4e8f1a3d5_phase2_auth_sessions_fuzzy.py` — auth, sessions, fuzzy eval
3. `d4e6f8a2b1c3_add_groups.py` — groups table
4. `e5f7a9c2b4d6_session_settings_device_token.py` — allow_repeat, show_correct_answer, device_token
5. `f6g8b0d1c3e5_add_telemetry_events.py` — telemetry_events table
6. `g7h9i1j2k3l4_add_is_imported_to_quizzes.py` — is_imported column
7. `h8i0j2k3l4m5_add_minigame_score.py` — minigame_score on attempts
8. `i9j1k3l4m5n6_add_google_auth.py` — google_id on users, password_hash nullable
9. `j0k2l4m5n6o7_add_image_url_to_questions.py` — image_url on questions

---

## Frontend Routes/Components Present

### Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Login form |
| `/register` | Registration form |
| `/quizzes` | "Quizík" dashboard — quiz list, New Quiz modal (blank/file/link), Groups + Sessions links |
| `/quizzes/[id]/edit` | Quiz editor with question form, reorder, accepted_answers for short_answer |
| `/import` | File import (CSV/Excel) with example table |
| `/groups` | Groups list (classroom containers) |
| `/groups/[id]` | Group detail — sessions list with search + status filter, add session form |
| `/sessions` | All sessions — list with quiz title, status filter, search, create form |
| `/sessions/[id]` | Session detail — attempts table, settings editor (all fields), open/close toggle |
| `/sessions/[id]/attempts/[attemptId]` | Attempt review — per-question comparison, score override, anti-cheat report |
| `/play/[slug]` | Public play — name entry → questions → (optional minigame) → result with answer reveal |
| `/play/[slug]/leaderboard` | Public leaderboard (session-scoped) |

### Key components
- `components/play/Minigame.tsx` — tap-sprint minigame (shown every 3 questions when gamification_enabled)
- `components/editor/QuestionForm.tsx` — question editor with accepted_answers alias editor
- `contexts/AuthContext.tsx` — auth state (user, login, register, logout)
- `lib/api-client.ts` — Bearer token, handles 204 No Content correctly

---

## Implemented Features (Phase 1–3)

### Authentication
- Email/password register + login with JWT
- Token stored in `localStorage`, auto-injected by api-client
- 401 auto-redirect to login

### Quiz authoring
- Create, edit, publish, archive, delete quiz templates
- 4 question types: `single_choice`, `multiple_choice`, `true_false`, `short_answer`
- Per-question: points, explanation, position (drag-reorder)
- Short answer: primary correct answer + fuzzy-matched alias list (`accepted_answers`)
- Publish guard: quiz must have ≥1 question
- Share slug (auto-generated on publish), copy share link
- Clone within own library (badge: "Copy"), import via share link (badge: "Imported")
- Bulk import from CSV/Excel

### Sessions
- Create session from published quiz template
- Settings: title, opens_at/closes_at, leaderboard toggle, allow_repeat, show_correct_answer, gamification_enabled
- Edit all settings after creation
- Open/close session (status: active/closed)
- Organize sessions into Groups (classroom containers)

### Public play
- Device token (localStorage UUID) for one-attempt enforcement when `allow_repeat=False`
- Anti-cheat telemetry: tab_hidden, focus_lost, copy_paste, fast_answer events
- Minigame (tap-sprint, 5 s) shown every 3 questions when `gamification_enabled=True`
- Answer reveal on result screen when `show_correct_answer=True`

### Teacher review
- Attempt list per session with score/percentage
- Per-attempt: question body + student answer vs correct answer side-by-side
- Manual score override with reason + audit trail
- Anti-cheat report: risk level (low/medium/high), human-readable event timeline
- Hide/unhide attempts from leaderboard

### Leaderboard
- Public per-session leaderboard, session-scoped
- Teacher can soft-hide individual attempts

---

## Partial / Deferred

| Feature | Status |
|---------|--------|
| Google OAuth | Built — `POST /auth/google`, frontend `GoogleLogin` button on login/register |
| Email verification | SMTP config present, not enforced |
| Quiz versioning (immutable snapshots) | `clone_of_id` tracks lineage; full versioning deferred |
| Quiz analytics UI | `quiz_analytics` model exists; computation + UI deferred |
| Role-based access (student portal) | `role` column exists; no student-specific UI |
| Celery async jobs | Worker + Beat present; import jobs + auto session open/close |

---

## What Is Still Missing (Planned)

1. **Analytics dashboard** — per-quiz stats: avg score, hardest questions, time distribution
2. **Email verification** — only needed when registering without Google OAuth

---

## Authentication Setup

### Required env vars (add to `.env`):
```
SECRET_KEY=<random 64-char string>
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### First-run:
```bash
docker compose --env-file .env down
docker compose --env-file .env build
docker compose --env-file .env up -d
docker compose --env-file .env exec api alembic upgrade head
# then open http://localhost:3100/register
```

---

## Known Issues / Limitations
- Question positions in import-confirm start from 0; manual creation starts from 1 (legacy inconsistency)
- `make` not available on Windows — use `docker compose ...` commands directly

## Phase 4 Setup Notes

### Google OAuth (optional)
Add to `.env`:
```
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same-client-id>
```
Google button only renders on login/register when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set.

### New packages (requires rebuild)
- Backend: `google-auth`, `aiofiles`
- Frontend: `@react-oauth/google`, `react-qr-code`

```bash
docker compose --env-file .env build
docker compose --env-file .env up -d
docker compose --env-file .env exec api alembic upgrade head
```
