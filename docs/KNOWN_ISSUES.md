# Known Issues

## Must Fix Soon
- **Auth is mocked** via auto-created static admin user; no real authentication.
- **Architecture drift** between `ARCHITECTURE_SPEC.md` and actual code (missing auth/play/analytics modules and routes).
- **Frontend dependency mismatch**: `react-hook-form` and `lucide-react` are imported but not declared in `frontend/package.json`.
- **Low test coverage**: backend tests currently only contain minimal fixture scaffold.
- **Mixed error response contracts** (`AppException` envelope vs FastAPI default `detail`).

## Nice to Fix Later
- Root frontend metadata and README still scaffold-default.
- Import base interface type signature mismatch with concrete parser implementations.
- Import job deletion policy may be too permissive (allows completed jobs).
- Position indexing inconsistency between manually created questions (1-based) and import-confirmed questions (0-based).

## Accepted MVP Limitations (for now)
- Creator-only UI pages (`/quizzes`, `/quizzes/[id]/edit`) without participant runtime.
- Analytics schema exists without analytics computation endpoints.
- Import parser heuristics are best-effort and may produce warnings/normalization assumptions.
- OCR for scanned PDFs is not included.
