"""Quizik API — Import Service."""

import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import async_session
from src.exceptions import AppException, NotFoundException
from src.models.import_job import ImportJob
from src.models.question import Question
from src.models.quiz import Quiz
from src.schemas.import_job import ConfirmImportRequest, ImportJobResponse, UploadResponse
from src.utils.storage import validate_and_save_upload
from src.workers.import_tasks import process_import_job


async def upload_file(file: UploadFile, user_id: uuid.UUID) -> UploadResponse:
    """Validate file, save to storage, create ImportJob, and enqueue Celery task."""
    job_id = uuid.uuid4()
    
    # 1. Validate & Save (throws if size > 10MB or unsupported extension)
    try:
        file_path = await validate_and_save_upload(file, str(job_id), str(user_id))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e

    # 2. Create DB Record
    async with async_session() as session:
        job = ImportJob(
            id=job_id,
            user_id=user_id,
            file_name=file.filename or "unknown",
            file_path=file_path,
            status="pending",
        )
        session.add(job)
        await session.commit()

    # 3. Enqueue Celery task (fire and forget)
    process_import_job.delay(str(job_id))

    return UploadResponse(job_id=job_id, status="pending")


async def get_job_status(job_id: uuid.UUID, user_id: uuid.UUID) -> ImportJobResponse:
    """Retrieve the status and parsed preview of an import job."""
    async with async_session() as session:
        result = await session.execute(
            select(ImportJob).where(ImportJob.id == job_id, ImportJob.user_id == user_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise NotFoundException("ImportJob")

        return ImportJobResponse(
            id=job.id,
            status=job.status,
            file_name=job.file_name,
            result=job.result,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )


async def confirm_import(
    job_id: uuid.UUID, user_id: uuid.UUID, request: ConfirmImportRequest
) -> Quiz:
    """Create a new Draft Quiz and Questions based on the confirmed parsed data."""
    async with async_session() as session:
        # Load and validate job
        result = await session.execute(
            select(ImportJob).where(ImportJob.id == job_id, ImportJob.user_id == user_id)
        )
        job = result.scalar_one_or_none()
        
        if not job:
            raise NotFoundException("ImportJob")
        if job.status != "completed":
            raise AppException(status_code=400, code="JOB_NOT_READY", message="Job is not completed")
        if job.quiz_id is not None:
            raise AppException(status_code=400, code="JOB_ALREADY_CONFIRMED", message="Job already confirmed")

        # 1. Create Quiz Setup
        quiz = Quiz(
            author_id=user_id,
            title=request.title,
            description=request.description,
            status="draft",
        )
        session.add(quiz)
        await session.flush()  # To get quiz.id

        # 2. Iterate and Create Questions
        for i, q_preview in enumerate(request.questions):
            question = Question(
                quiz_id=quiz.id,
                position=i,
                type=q_preview.type,
                body=q_preview.body,
                explanation=q_preview.explanation,
                options=[opt.model_dump() for opt in q_preview.options],
                points=q_preview.points,
            )
            session.add(question)

        # 3. Mark job as complete
        job.quiz_id = quiz.id
        await session.commit()

        # reload quiz
        return quiz


async def delete_job(job_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Delete a pending or failed import job."""
    async with async_session() as session:
        result = await session.execute(
            select(ImportJob).where(ImportJob.id == job_id, ImportJob.user_id == user_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise NotFoundException("ImportJob")
        
        if job.status not in ["pending", "failed", "completed"]:
            raise AppException(400, "CANNOT_DELETE", "Cannot delete processing job")

        await session.delete(job)
        await session.commit()
