.PHONY: up down build logs restart shell-api shell-web migrate lint format test clean

# ── Docker ──
up:
	docker compose -f infra/docker/docker-compose.yml --env-file .env up -d

down:
	docker compose -f infra/docker/docker-compose.yml --env-file .env down

build:
	docker compose -f infra/docker/docker-compose.yml --env-file .env build

logs:
	docker compose -f infra/docker/docker-compose.yml --env-file .env logs -f

restart:
	docker compose -f infra/docker/docker-compose.yml --env-file .env restart

# ── Shells ──
shell-api:
	docker compose -f infra/docker/docker-compose.yml --env-file .env exec api bash

shell-web:
	docker compose -f infra/docker/docker-compose.yml --env-file .env exec web sh

# ── Database ──
migrate:
	docker compose -f infra/docker/docker-compose.yml --env-file .env exec api alembic upgrade head

migrate-create:
	docker compose -f infra/docker/docker-compose.yml --env-file .env exec api alembic revision --autogenerate -m "$(name)"

# ── Quality ──
lint:
	cd apps/api && ruff check src/ tests/
	cd apps/web && npm run lint

format:
	cd apps/api && ruff format src/ tests/
	cd apps/web && npm run format

test:
	cd apps/api && pytest tests/ -v
	cd apps/web && npm run test

# ── Cleanup ──
clean:
	docker compose -f infra/docker/docker-compose.yml --env-file .env down -v --rmi local
