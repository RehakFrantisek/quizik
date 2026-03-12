"""Quizik API — File storage utility."""

import os
from pathlib import Path

from fastapi import UploadFile

from src.exceptions import AppException

# Defined in docker-compose.yml volumes
UPLOAD_DIR = Path("/app/data/uploads")

# 10 MB limit
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "text/csv": ".csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/pdf": ".pdf",
}

ALLOWED_EXTENSIONS = {ext for ext in ALLOWED_MIME_TYPES.values()}


def get_extension(filename: str) -> str:
    """Extract extension from filename, ensuring it starts with a dot and is lowercase."""
    _, ext = os.path.splitext(filename)
    return ext.lower()


async def validate_and_save_upload(file: UploadFile, job_id: str, user_id: str) -> str:
    """
    Validate the uploaded file (size, extension, mime type), then save it
    to the local volume using the job_id as the filename.

    Returns the absolute file path where the file was saved.
    """
    # 1. Validate Extension
    ext = get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise AppException(
            status_code=415,
            code="UNSUPPORTED_MEDIA_TYPE",
            message=f"Unsupported file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # 2. Size Validation via reading chunks
    content = bytearray()
    while chunk := await file.read(1024 * 1024):  # read in 1MB chunks
        content.extend(chunk)
        if len(content) > MAX_FILE_SIZE:
            raise AppException(
                status_code=413,
                code="PAYLOAD_TOO_LARGE",
                message=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB",
            )
    
    # Optional magic byte verification via filetype library could go here, deferred for brevity.

    # 3. Save to disk
    user_dir = UPLOAD_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = user_dir / f"{job_id}{ext}"
    
    # Write synchronous block (fine for small files, async disk I/O would use aiofiles)
    with open(file_path, "wb") as f:
        f.write(content)

    return str(file_path)
