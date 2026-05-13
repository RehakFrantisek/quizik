"""Quizik API — Workers package."""

# Explicitly import task modules so Celery worker discovers all registered tasks.
from src.workers import session_tasks  # noqa: F401
