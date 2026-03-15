"""Quizik API — Import endpoints."""

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from src.dependencies import get_current_user
from src.models.user import User
from src.schemas.import_job import ConfirmImportRequest, ImportJobResponse, UploadResponse
from src.services.import_service import confirm_import, get_job_status, upload_file

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/upload", response_model=UploadResponse)
async def upload_file_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a file to create an import job."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")
    return await upload_file(file, current_user.id)


@router.get("/jobs/{job_id}", response_model=ImportJobResponse)
async def get_job_status_endpoint(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Check the status of an import job and get the parsed preview."""
    return await get_job_status(job_id, current_user.id)


@router.post("/jobs/{job_id}/confirm")
async def confirm_import_endpoint(
    job_id: uuid.UUID,
    request: ConfirmImportRequest,
    current_user: User = Depends(get_current_user),
):
    """Confirm a completed import job and create a quiz."""
    quiz = await confirm_import(job_id, current_user.id, request)
    return {"quiz_id": str(quiz.id)}


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job_endpoint(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    """Delete a pending or failed import job."""
    from src.services.import_service import delete_job
    await delete_job(job_id, current_user.id)
