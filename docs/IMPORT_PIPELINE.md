# Import Pipeline

## Implementation Status
The import pipeline exists and is operational at a foundational level:
- Upload API persists source files and creates an `import_jobs` record.
- Celery worker processes jobs asynchronously.
- Format-specific importers parse content into a normalized question preview.
- Confirm endpoint creates a draft quiz from reviewed parsed payload.

## Supported Formats (Current)
- CSV (`.csv`) — parsed with pandas.
- XLSX (`.xlsx`) — parsed with pandas/openpyxl, then delegated to CSV logic.
- DOCX (`.docx`) — parsed with `python-docx` + regex/state machine.
- PDF (`.pdf`) — text extraction via `pdfplumber`, then DOCX-like parsing logic.

## Upload Flow
1. `POST /api/v1/import/upload` accepts multipart file.
2. Backend validates extension and file size (10 MB max).
3. File is stored under `/app/data/uploads/<user_id>/<job_id>.<ext>`.
4. `import_jobs` row created (`status=pending`).
5. Celery task enqueued with job id.

## ImportJob Lifecycle
- `pending` → created after upload.
- `processing` → set by worker when picked up.
- `completed` → parsed result persisted successfully.
- `failed` → parse or processing failure, error details in `result.error`.

`completed_at` is set in worker `finally` block for both success and failure.

## Parser Module Behavior

## CSV Parser
- Flexible case-insensitive column matching.
- Supports mapping for `type`, question body, correct answer, points, explanation.
- Attempts auto-detection of option columns.
- Heuristics:
  - defaults unknown type to `single_choice`
  - upgrades to `multiple_choice` if multiple correct options detected
  - auto-marks first option correct if none detected

## XLSX Parser
- Reads first sheet to DataFrame.
- Converts DataFrame to in-memory CSV and reuses CSV parser.

## DOCX Parser
- Extracts numbered questions (`1.` / `1)`) and lettered options (`a.` / `A)` / `*`).
- Treats bold or `*` prefixed options as correct answers.
- Converts multiple marked options to `multiple_choice`.
- Produces warnings for skipped or ambiguous items.

## PDF Parser
- Extracts plain text page-by-page via `pdfplumber`.
- If no text is extracted, returns explicit error (e.g., scanned image PDF).
- Reuses DOCX-like state machine over extracted lines.
- Correct-answer detection relies on `*` markers (formatting typically lost in PDF extraction).

## OCR Status
- OCR is effectively excluded in current implementation.
- PDF importer only handles machine-readable text PDFs; scanned/image PDFs fail with a clear error.

## Current Limitations
- No persisted “import template versioning” or parser confidence score.
- `BaseImporter.parse` type contract (`str`) differs from concrete implementations (`str | IO`).
- Import confirm trusts client-sent reviewed payload shape after schema validation; no extra semantic reconciliation.
- Deleting completed jobs is currently allowed by service policy.
- No frontend import review page present in this repository snapshot.

## Production-Readiness Gaps
To make import pipeline production-ready, the repo still needs:
- robust file type sniffing (magic bytes), not extension-only trust.
- parser test suite with corpus-based fixtures across formats.
- stronger idempotency and duplicate-detection around job processing.
- stricter retention/cleanup policy for uploaded files and old jobs.
- UI flow for preview/edit/confirm/reject import results.
- observability: job metrics, retries/backoff visibility, dead-letter handling.
