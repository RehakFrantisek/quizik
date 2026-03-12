"""Quizik API — FastAPI application factory."""

from fastapi import FastAPI

from src.exceptions import register_exception_handlers
from src.middleware import configure_logging, setup_middleware
from src.routers import health


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    configure_logging()

    app = FastAPI(
        title="Quizik API",
        description="Quiz creation, sharing, and analytics platform",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # Middleware
    setup_middleware(app)

    # Exception handlers
    register_exception_handlers(app)

    from src.routers import health, imports, quizzes, questions

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(imports.router, prefix="/api/v1")
    app.include_router(quizzes.router, prefix="/api/v1")
    app.include_router(questions.router, prefix="/api/v1")

    return app


app = create_app()
