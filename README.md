# Quizik

Quizik is a quiz creation, sharing, and analytics platform.

## Architecture

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: FastAPI, Python 3.12, SQLAlchemy, Celery
- **Database**: PostgreSQL 16
- **Cache/Broker**: Redis 7

See `ARCHITECTURE_SPEC.md` for full details.

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend scripts if needed)
- Python 3.12+ (for local backend scripts if needed)

### Setup

1. The `.env` file should already be configured from `.env.example`.
2. Build the Docker images:
   ```bash
   make build
   ```
3. Start the services:
   ```bash
   make up
   ```
4. Run database migrations:
   ```bash
   make migrate
   ```

### Access Points
- **Frontend**: http://localhost:3100
- **Backend API**: http://localhost:8100
- **MailHog (Dev Email)**: http://localhost:8025 (SMTP port 1025)

### Useful Commands

- `make logs`: View logs for all containers.
- `make down`: Stop and remove containers.
- `make shell-api`: Open a Bash shell in the API container.
- `make test`: Run backend tests and frontend tests.
- `make lint` / `make format`: Code quality checks.
