.PHONY: up down build logs restart shell-api shell-web migrate lint format test clean

# ── Docker ──
up:
	docker compose --env-file .env up -d

down:
	docker compose --env-file .env down

build:
	docker compose --env-file .env build

logs:
	docker compose --env-file .env logs -f

restart:
	docker compose --env-file .env restart

# ── Shells ──
shell-api:
	docker compose --env-file .env exec api bash

shell-web:
	docker compose --env-file .env exec web sh

# ── Database ──
migrate:
	docker compose --env-file .env exec api alembic upgrade head

migrate-create:
	docker compose --env-file .env exec api alembic revision --autogenerate -m "$(name)"

# ── Quality ──
lint:
	docker compose --env-file .env exec api ruff check src/ tests/
	docker compose --env-file .env exec web npm run lint || echo "Lint skipped"

format:
	docker compose --env-file .env exec api ruff format src/ tests/

test:
	docker compose --env-file .env exec api pytest tests/ -v

# ── Cleanup ──
clean:
	docker compose --env-file .env down -v --rmi local
