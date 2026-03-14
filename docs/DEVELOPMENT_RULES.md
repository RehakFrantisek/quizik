# Development Rules

## 1) Source of Truth
- `docs/` files are the current implementation truth.
- `ARCHITECTURE_SPEC.md` is treated as intended direction; if code differs, contributors must document the delta before expanding scope.
- Do not assume planned modules exist—verify by inspecting current code paths.

## 2) Architecture Discipline
- Keep backend layering: **router → service → model/database**.
- Routers should remain transport-focused (validation/HTTP concerns), not DB-heavy.
- Services should contain business rules and authorization checks.
- Avoid ad-hoc cross-layer imports that bypass service boundaries.

## 3) Avoid Overengineering
- Prefer small, incremental PRs against existing structure.
- No large abstraction framework unless there are at least two concrete call sites.
- Do not introduce “future-proof” modules that are unused in current phase.

## 4) Branch and Change Strategy
- One branch per focused concern.
- Keep PRs reviewable (prefer smaller diffs).
- Every functional change must update relevant docs in `docs/`.

## 5) Introducing New Modules
- New backend domain requires:
  - router,
  - service,
  - schemas,
  - tests,
  - docs update.
- New frontend feature route requires:
  - route file(s),
  - API integration,
  - error/loading states,
  - docs update.

## 6) Database Migrations
- Never edit old migration revisions after merge.
- Add forward-only Alembic migrations.
- Include migration rationale in PR notes.
- Validate migration against current compose DB before merge.

## 7) Documentation Requirements
- Update these docs when behavior changes:
  - `CURRENT_STATE.md`
  - `ARCHITECTURE.md`
  - `API_REFERENCE.md`
  - `DATABASE_SCHEMA.md` (if schema touched)
  - route/import/analytics docs as applicable
- Mark uncertainties explicitly as unknown/partial confidence.

## 8) Coding and Refactoring Guardrails
- Refactor only with clear payoff and bounded blast radius.
- Keep public API contracts stable unless versioned changes are deliberate.
- Maintain consistent error envelope where possible.
- Preserve current data contracts (`settings`, `options`, import result schema) unless coordinated migration is included.

## 9) “Do Not Change Architecture Casually” Principles
- Do not replace major stack components (FastAPI/Next/Postgres/Celery) without a written RFC.
- Do not move from JSONB to fully normalized alternatives without migration and performance rationale.
- Do not introduce background task mechanisms parallel to Celery unless explicitly approved.
- Do not add auth model changes without assessing ownership impacts across quizzes/imports/attempts.

## 10) Testing Expectations
- At minimum, add/maintain:
  - backend endpoint tests for changed routes,
  - service-level tests for business rules,
  - parser tests for import changes,
  - frontend smoke/e2e coverage for critical flows.
