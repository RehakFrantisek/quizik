# Roadmap (From Actual Current State)

This roadmap assumes the current repository baseline and avoids restarting architecture from scratch.

## Phase 7 — Stabilization / Polish
**Goal**: make existing creator + import surfaces reliable and coherent.

**Scope**
- Resolve dependency/config drift (frontend package deps, metadata, README alignment).
- Harden quiz/question validation and consistency checks.
- Improve error consistency (avoid mixed `AppException` and raw FastAPI error shapes).
- Add smoke tests for current working APIs.

**Deliverables**
- Clean build/run path with updated docs.
- Stabilized editor workflows and predictable error handling.
- Baseline CI checks for lint + core tests.

**Risks**
- Hidden regressions due to low existing test coverage.

## Phase 8 — Auth & User Ownership
**Goal**: replace mocked admin dependency with real authentication.

**Scope**
- Implement auth router/service (register/login/refresh/logout/me).
- Add secure password hashing + JWT issuance/refresh flow.
- Introduce ownership checks based on real user identity.

**Deliverables**
- Multi-user login flow.
- User-scoped quiz/import operations.

**Risks**
- Security bugs if token/cookie handling is rushed.

## Phase 9 — Participant Runtime + Grading
**Goal**: enable share-link quiz participation and scoring.

**Scope**
- Implement play endpoints by `share_slug`.
- Add attempt start/progress/submit APIs.
- Implement grading engine for all supported question types.
- Add participant frontend flow.

**Deliverables**
- End-to-end publish → share → attempt → score lifecycle.

**Risks**
- Ambiguity in short-answer grading acceptance rules.

## Phase 10 — Analytics & Settings Expansion
**Goal**: provide actionable creator insights and richer quiz controls.

**Scope**
- Compute analytics aggregates from attempts/answers.
- Expose analytics endpoints and dashboard views.
- Expand settings enforcement (timers, attempt limits, result visibility).

**Deliverables**
- MVP analytics dashboard and per-question insights.
- Settings applied in runtime rather than only stored in JSONB.

**Risks**
- Performance issues on larger datasets without query tuning/caching.

## Phase 11 — Import Pipeline Production Hardening
**Goal**: move import from “working prototype” to reliable ingestion subsystem.

**Scope**
- Add parser fixture corpus and coverage.
- Improve file validation and security checks.
- Add robust retry/error observability and cleanup policies.
- Build frontend import review UX.

**Deliverables**
- Trustworthy import experience for CSV/XLSX/DOCX/PDF.

**Risks**
- Document format variability may require iterative parser tuning.

## Phase 12 — Exports, Testing, Deployment Readiness, Security
**Goal**: make project operationally deployable.

**Scope**
- Export features (attempt data/analytics CSV and possibly PDF reports).
- Expand automated tests (unit/service/integration/e2e).
- Production deployment artifacts and environment separation.
- Security hardening (rate limits, stricter CORS/cookies, secret management, audit logging).

**Deliverables**
- Deployment playbook + confidence test suite.
- Security review checklist implemented.

**Risks**
- Underestimated ops complexity for production observability and incident readiness.

## Optional Phase 13 — SaaS / Multi-Tenant Path
**Goal**: support team/org accounts and monetizable SaaS trajectory.

**Scope**
- Organization/workspace model.
- Role-based access control.
- Billing and usage metering foundations.

**Deliverables**
- Tenant-aware data ownership model and APIs.

**Risks**
- Requires careful migration strategy for existing single-tenant assumptions.
