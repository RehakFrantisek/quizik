# Frontend Routes

## Route Inventory (Actual)

## `/`
- Landing page with a CTA to `/quizzes`.
- Still branded with phase/scaffold text, not final product messaging.

## `/quizzes`
- Dashboard-style list of quizzes for current mocked user.
- Supports creating a new quiz and navigating to editor.
- Fetch pattern: `useEffect` + direct `apiClient.get('/quizzes')`.

## `/quizzes/[id]/edit`
- Main creator workflow route.
- Features:
  - edit quiz title/description
  - add/edit/delete question
  - publish quiz
  - question preview and form controls
- Fetch/update pattern: client-side imperative calls via `apiClient`.

## Creator Flow (Implemented)
1. Open `/quizzes`.
2. Click **Create New Quiz** (creates draft via API and redirects).
3. Use editor route to add and maintain question set.
4. Publish quiz when at least one question exists.

## Participant Flow (Current State)
- Not implemented in frontend.
- No `/play/[slug]` or equivalent participant pages exist in this repo snapshot.

## MVP Readiness by Page
- `/quizzes`: functional MVP page for author list/create.
- `/quizzes/[id]/edit`: functional MVP page for author editing/publishing.
- `/`: provisional/placeholder branding and metadata.
- Participant/auth/analytics pages: missing.

## Client Data Fetching & State Handling
- Thin API wrapper in `src/lib/api-client.ts` with `get/post/patch/delete`.
- `cache: 'no-store'` used for GET to avoid stale data.
- Local component state is source of truth during editing.
- No shared global state library in use.
- Error handling is mostly `alert()` and console logging.

## Notable Frontend Gaps
- `frontend/package.json` does not declare `react-hook-form` or `lucide-react`, though code imports them.
- No route-level loading/error boundary files beyond default framework behavior.
- No test files or e2e coverage for current pages.
