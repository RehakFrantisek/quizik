"""Quizik API — Celery application configuration."""

from celery import Celery

from src.config import settings

celery_app = Celery(
    "quizik",
    broker=settings.redis_url,
    backend=settings.redis_url.replace("/0", "/1"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_time_limit=300,
    task_soft_time_limit=270,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_queue="import",
    beat_schedule={
        "auto-manage-sessions": {
            "task": "auto_manage_sessions",
            "schedule": 300.0,  # every 5 minutes
        },
    },
)

# Auto-discover tasks from workers module
celery_app.autodiscover_tasks(["src.workers"])
