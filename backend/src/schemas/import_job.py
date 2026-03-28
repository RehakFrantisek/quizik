"""Quizik API — Import schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ParsedOption(BaseModel):
    id: str  # e.g., 'A', 'B', '1', '2'
    text: str
    is_correct: bool


class ParsedQuestionPreview(BaseModel):
    type: str = Field(pattern="^(single_choice|multiple_choice|true_false|short_answer)$")
    body: str
    options: list[ParsedOption]
    points: int = 1
    explanation: str | None = None


class UploadResponse(BaseModel):
    job_id: uuid.UUID
    status: str


class ImportJobResult(BaseModel):
    parsed_questions: list[ParsedQuestionPreview] | None = None
    warnings: list[str] | None = None
    error: str | None = None


class ImportJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    file_name: str
    result: ImportJobResult | None = None
    created_at: datetime
    completed_at: datetime | None = None


class ConfirmImportRequest(BaseModel):
    """Payload to confirm an import, sending back the finalized parsed questions from the review UI."""
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    mode: str = Field(default="create_new", pattern="^(create_new|append_existing)$")
    existing_quiz_id: uuid.UUID | None = None
    questions: list[ParsedQuestionPreview] = Field(min_items=1)
