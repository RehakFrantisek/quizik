"""Quizik API — Celery tasks for Import processing."""

import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from src.database import async_session
from src.models.import_job import ImportJob
from src.utils.storage import get_extension
from src.workers.celery_app import celery_app

logger = structlog.get_logger()


async def _process_import_job_async(job_id: str) -> None:
    """Async implementation of the import job processing."""
    async with async_session() as session:
        # Load Job
        result = await session.execute(select(ImportJob).where(ImportJob.id == job_id))
        job = result.scalar_one_or_none()
        
        if not job or job.status != "pending":
            await logger.awarning("job_not_found_or_not_pending", job_id=job_id)
            return
            
        # Update Status to Processing
        job.status = "processing"
        await session.commit()
        await session.refresh(job)
        
        try:
            # 1. Detect Importer Strategy based on extension
            ext = get_extension(job.file_name)
            
            # NOTE: Strategy implementation goes here linking to apps/api/src/importers/*
            from src.importers.factory import get_importer  # imported locally to avoid circulars
            
            importer = get_importer(ext)
            
            # 2. Extract and Parse Text
            with open(job.file_path, "rb") as f:
                parsed_result = importer.parse(f)
            
            # 3. Store Result View on Job
            job.result = parsed_result.model_dump()
            job.status = "completed"
            
            await logger.ainfo("import_job_completed", job_id=job_id, questions=len(parsed_result.parsed_questions))
            
        except Exception as e:
            await logger.aexception("import_job_failed", job_id=job_id)
            job.status = "failed"
            job.result = {"error": str(e), "warnings": [], "parsed_questions": []}
            
        finally:
            job.completed_at = datetime.utcnow()
            await session.commit()


@celery_app.task(bind=True, max_retries=3)
def process_import_job(self, job_id: str) -> None:
    """Celery task entrypoint."""
    logger.info("processing_import_job", job_id=job_id)
    # Bridge sync Celery to Python's asyncio since our DB logic is fully async.
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    loop.run_until_complete(_process_import_job_async(job_id))
