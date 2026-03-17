"""Quizik API — FastAPI application factory."""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.exceptions import register_exception_handlers
from src.middleware import configure_logging, setup_middleware

UPLOAD_DIR = Path("/app/data/uploads")
logger = logging.getLogger(__name__)


def run_migrations() -> None:
    """Run alembic migrations on startup via subprocess."""
    import subprocess
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd="/app",
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            logger.info("Database migrations applied.")
        else:
            logger.warning(f"Migration failed: {result.stderr}")
    except Exception as e:
        logger.warning(f"Migration skipped: {e}")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    configure_logging()
    run_migrations()

    app = FastAPI(
        title="Quizik API",
        description="Quiz creation, sharing, and analytics platform",
        version="0.2.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # Middleware
    setup_middleware(app)

    # Exception handlers
    register_exception_handlers(app)

    from src.routers import admin, auth, groups, health, imports, play, questions, quizzes, sessions, uploads

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(admin.router, prefix="/api/v1")
    app.include_router(quizzes.router, prefix="/api/v1")
    app.include_router(questions.router, prefix="/api/v1")
    app.include_router(imports.router, prefix="/api/v1")
    app.include_router(sessions.router, prefix="/api/v1")
    app.include_router(groups.router, prefix="/api/v1")
    app.include_router(play.router, prefix="/api/v1")
    app.include_router(uploads.router, prefix="/api/v1")

    @app.get("/")
    async def root():
        return {"status": "ok"}

    # Serve uploaded files (question images etc.)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/api/v1/static/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

    return app


app = create_app()
