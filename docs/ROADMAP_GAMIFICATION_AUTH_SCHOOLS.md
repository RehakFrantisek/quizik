# Roadmap: Gamification, Auth, and School-Oriented Evolution

> **Implementation status (2026-03-14):**
> Phases 1–5 (real auth, ownership, clone/session model, review/leaderboard, fuzzy open answers)
> have been implemented as of Phase 2 implementation pass. See `docs/CURRENT_STATE.md` for details.

This roadmap is incremental and designed to preserve current MVP flows.

## Terminology Baseline
- Template = editable quiz source.
- Clone = copied template with new ownership.
- Version = immutable snapshot.
- Session = published run with leaderboard scope.
- Attempt = participant run in one session.

---

## Phase 1 — Real Authentication + Ownership
**Goal**
Replace mocked auth with real user accounts and ownership boundaries.

**Main backend changes**
- Add auth router/service (`register`, `login`, `refresh`, `logout`, `me`).
- Introduce robust auth dependencies for user identity.
- Apply ownership checks to quiz/import endpoints.

**Main frontend changes**
- Add login/register flows (email/password first).
- Add authenticated navigation and session handling.

**Database/model impact**
- Reuse `users` table, add required auth fields if missing (verification/reset support optional).

**Migration concerns**
- Backfill current mocked content to a default migration user if needed.

**Risks**
- Token/cookie misconfiguration.

**Do NOT do in this phase**
- Do not add organization/teams yet.
- Do not add OAuth first if it delays base auth reliability.

---

## Phase 2 — Template / Clone / Version / Session Model
**Goal**
Introduce clear lifecycle boundaries for editing vs publishing.

**Main backend changes**
- Add entities or table evolution for template, version, session.
- Add clone endpoint from template/version.
- Ensure published sessions point to immutable versions.

**Main frontend changes**
- Add “Clone quiz” actions.
- Add “Publish as session” flow with session settings.

**Database/model impact**
- Add `quiz_versions`, `quiz_sessions`, optional `session_access`.
- Keep compatibility bridge from existing `quizzes/share_slug`.

**Migration concerns**
- Map existing published quizzes to initial template + version + session records.

**Risks**
- Backward compatibility complexity with existing links.

**Do NOT do in this phase**
- Do not rebuild the entire editor UI.
- Do not split into microservices.

---

## Phase 3 — Leaderboard and Attempt Review Improvements
**Goal**
Make session-scoped leaderboard moderation and attempt inspection practical.

**Main backend changes**
- Session leaderboard APIs (list/clear/remove entry).
- Attempt detail endpoint with per-question timeline.
- Manual review records for score adjustments.

**Main frontend changes**
- Session admin view: leaderboard moderation controls.
- Attempt detail/review UI for teachers.

**Database/model impact**
- Add `leaderboard_entries` and `manual_reviews` (or augment attempts with audit trail table).

**Migration concerns**
- Existing attempts must map to a session context.

**Risks**
- Disputes if moderation is not auditable.

**Do NOT do in this phase**
- Do not introduce heavy BI tooling.

---

## Phase 4 — Open-Answer Normalization and Fuzzy Matching
**Goal**
Improve auto-evaluation for open answers with safe confidence boundaries.

**Main backend changes**
- Implement normalization pipeline.
- Add alias/accepted-variant support.
- Add typo-tolerant fuzzy matching.
- Add confidence + review-needed flags.

**Main frontend changes**
- Authoring UI for accepted variants.
- Review UI highlighting low-confidence autogrades.

**Database/model impact**
- Extend question config for accepted variants and matching mode/thresholds.

**Migration concerns**
- Default behavior must preserve existing grading semantics.

**Risks**
- False positives/negatives in fuzzy matching.

**Do NOT do in this phase**
- Do not auto-grade long essays without review guardrails.

---

## Phase 5 — Anti-Cheat Telemetry
**Goal**
Collect and expose risk signals without punitive automation.

**Main backend changes**
- Telemetry ingest endpoint(s) tied to attempt/session.
- Risk summary computation for teacher UI.

**Main frontend changes**
- Client event capture (visibility change, inactivity markers, timing anomalies).
- Attempt review surfaces with telemetry indicators.

**Database/model impact**
- Add `attempt_telemetry` / `anti_cheat_events` table(s).

**Migration concerns**
- Data retention policy for telemetry size growth.

**Risks**
- Privacy concerns and false interpretations.

**Do NOT do in this phase**
- Do not hard-fail attempts automatically based on signals.

---

## Phase 6 — First Minigames (Feature-Flagged)
**Goal**
Introduce optional gamification modules that do not affect academic grading.

**Main backend changes**
- Session-level gamification config.
- Engagement score tracking separated from knowledge score.

**Main frontend changes**
- Lightweight minigame shell and trigger handling.
- Touch + pointer compatible interactions.

**Database/model impact**
- Add `gamification_config` and optional minigame result data linked to attempts.

**Migration concerns**
- Defaults must preserve current non-gamified behavior.

**Risks**
- UX complexity and accessibility regressions.

**Do NOT do in this phase**
- Do not make minigames mandatory.
- Do not combine engagement score with academic score.

---

## Phase 7 — Classroom Polish, Export, Admin Tools
**Goal**
Improve classroom operations and deployment readiness.

**Main backend changes**
- Export endpoints (CSV summaries, attempt detail exports).
- Admin moderation/audit endpoints.
- Optional Google OAuth integration after stable core auth.

**Main frontend changes**
- Class/session management UX polish.
- Export/download flows.
- Optional classroom presets.

**Database/model impact**
- Optional workspace/team tables if needed by demand.

**Migration concerns**
- Keep user-level ownership as default; workspace should be additive.

**Risks**
- Scope creep into LMS territory.

**Do NOT do in this phase**
- Do not build full assignments/gradebook module unless explicitly prioritized.

---

## Recommended Next Implementation Order
Strong recommendation for first coding work:
1. Real authentication.
2. Ownership model.
3. Clone + session model.
4. Review/leaderboard improvements.
5. Fuzzy open answers.
6. Anti-cheat telemetry.
7. First minigames.
