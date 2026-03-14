# Setup and Runbook

## Prerequisites
- Docker + Docker Compose
- Optional local tooling:
  - Node.js 20+
  - Python 3.12+

## Environment Setup
1. Copy env template:
   ```bash
   cp .env.example .env
   ```
2. Review values in `.env` (DB creds, Redis URL, frontend origin, ports).

## Start the Stack
From repo root:
```bash
make build
make up
```

Services started by `docker-compose.yml`:
- `postgres` (5432)
- `redis` (6379)
- `api` (default host port 8100)
- `worker` (Celery)
- `web` (default host port 3100)
- `mailhog` (8025 UI / 1025 SMTP)

## Run Migrations
```bash
make migrate
```

## Access Points
- Frontend: `http://localhost:3100`
- Backend API root (FastAPI): `http://localhost:8100`
- Swagger UI: `http://localhost:8100/api/docs`
- OpenAPI JSON: `http://localhost:8100/api/openapi.json`
- MailHog UI: `http://localhost:8025`

## Useful Operational Commands
```bash
make logs          # follow all service logs
make shell-api     # enter api container
make shell-web     # enter web container
make down          # stop stack
make clean         # stop + remove volumes/images
```

## Running Tests / Quality
```bash
make test
make lint
make format
```

Current reality:
- backend test suite is minimal scaffold, so passing tests do not imply broad coverage.
- frontend lint/test behavior depends on installed dependencies and scripts.

## Backend Local (outside Docker, optional)
Inside `backend/` with Python 3.12:
```bash
pip install -e ".[dev]"
uvicorn src.main:app --reload --host 0.0.0.0 --port 8100
```

## Frontend Local (outside Docker, optional)
Inside `frontend/`:
```bash
npm install
npm run dev
```

If running frontend locally against dockerized backend, ensure rewrite target and networking assumptions are adjusted (current `next.config.ts` points to `http://api:8100` which works in Compose network).

## Common Troubleshooting
- **API cannot connect to DB**: ensure `postgres` is healthy and `.env` DB URL matches compose service host `postgres`.
- **Worker not processing imports**: verify Redis health and worker logs (`make logs`).
- **Frontend API calls failing locally**: check Next rewrite destination and whether frontend is running inside docker network.
- **Migration errors**: run `make shell-api` then inspect `alembic current` / `alembic heads`.
- **Import upload failures**: verify file extension/type and size under 10 MB.
