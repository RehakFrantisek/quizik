"""Quizik API — FastAPI application factory."""

from fastapi import FastAPI

from apps.api.src.exceptions import register_exception_handlers
from apps.api.src.middleware import configure_logging, setup_middleware
from apps.api.src.routers import health


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

    # Routers
    app.include_router(health.router, prefix="/api/v1")

    return app


app = create_app()
