# Architecture (Actual Implementation Snapshot)

## 1) Implemented High-Level Architecture
- **Frontend:** Next.js App Router app (client-heavy pages).
- **Backend:** FastAPI with async SQLAlchemy session management.
- **Data:** PostgreSQL primary relational store with JSONB fields for flexible quiz/question/import payloads.
- **Async jobs:** Celery worker consuming import tasks via Redis.
- **Infra:** Docker Compose for local orchestration.

## 2) Frontend Architecture (Actual)
- Route-level client components for dashboard/editor.
- API calls use a small fetch wrapper (`/api/v1/*`) proxied via Next rewrite to `http://api:8100`.
- State is local to route components (no shared app-level state container).
- UI layer is currently ad-hoc Tailwind classes; no explicit design system module in repo.

## 3) Backend Architecture (Actual)
- Router → Service → Model pattern is present in implemented domains.
- Routers are thin and delegate to services.
- Services perform authorization checks against `author_id` with mocked user identity.
- DB sessions are async and committed/rolled back by dependency helper.
- Global exception handler normalizes error JSON for `AppException`.

## 4) Data Flow by Feature
### Quiz editor flow
1. Frontend dashboard creates quiz (`POST /quizzes`).
2. Editor fetches quiz with questions (`GET /quizzes/{id}`).
3. Metadata and questions mutate via PATCH/POST/DELETE endpoints.
4. Publish endpoint updates status and creates `share_slug` if needed.

### Publish/share flow
- Publish is an update operation guarded by “must have at least one question”.
- `share_slug` generation exists in backend; however, public play-by-slug endpoint is not implemented.

### Import pipeline flow
1. User uploads file via `/import/upload`.
2. Service validates file and writes to `/app/data/uploads/{user}/{job}.{ext}`.
3. Import job row inserted with `pending` status.
4. Celery task picks job, chooses importer strategy by extension.
5. Parsed preview (questions/warnings/error) is stored in `import_jobs.result`; status set to `completed` or `failed`.
6. Client confirms parsed payload via `/import/jobs/{id}/confirm`, creating draft quiz + questions.

### Participant runtime flow
- Intended in spec, not currently wired in app routers or frontend pages.

### Analytics flow
- Data model exists (`quiz_analytics`, attempts/answers fields), but no computation service/router pipeline is implemented.

## 5) Dependency Boundaries
- Backend domains generally respect layering.
- Worker imports service-level/domain modules directly and writes DB through async session.
- Frontend directly calls API without intermediate domain client abstraction.

## 6) Important Technical Decisions Observed
- JSONB chosen for:
  - quiz settings,
  - question options,
  - import parser result,
  - answer response payload,
  - analytics aggregate blobs.
- Import parsing favors heuristic extraction and warning accumulation rather than strict schema rejection.
- Development auth intentionally simplified to a static user provider.

## 7) Intended vs Actual Architecture Deviations
## Intended (from ARCHITECTURE_SPEC.md)
- Auth route group, play route group, analytics API/service, broader frontend folderization, Zustand stores, and additional docs/infra files.

## Actual (in code)
- Only health/quizzes/questions/import routers are present and registered.
- Frontend contains only three routes and one domain component.
- No auth/play/analytics backend routers or matching frontend pages.
- No visible state library usage (e.g., Zustand) despite spec claim.

## 8) Key Technical Debt
- Significant gap between architecture spec breadth and current running scope.
- Missing contract-level tests for API and import worker.
- Mock auth intertwined with normal endpoints (acceptable for dev, not for production).
