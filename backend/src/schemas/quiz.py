"""Quizik API — Quiz schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from src.schemas.question import QuestionOut

class QuizSettings(BaseModel):
    time_limit_sec: int = 600
    shuffle_questions: bool = True
    shuffle_options: bool = False
    show_results: str = Field(pattern="^(immediate|end|never)$", default="end")
    passing_score_pct: int = Field(default=70, ge=0, le=100)
    allow_anonymous: bool = True
    max_attempts_per_ip: int = 5
    cover_image_url: str | None = Field(default=None, max_length=1024)

class QuizBase(BaseModel):
    title: str = Field(max_length=255)
    description: str | None = None
    cover_image_url: str | None = Field(default=None, max_length=1024)

class QuizCreate(QuizBase):
    settings: QuizSettings | None = None

class QuizUpdate(BaseModel):
    title: str | None = Field(max_length=255, default=None)
    description: str | None = None
    cover_image_url: str | None = Field(default=None, max_length=1024)
    settings: QuizSettings | None = None
    status: str | None = Field(pattern="^(draft|published|archived)$", default=None)

class QuizOut(QuizBase):
    id: uuid.UUID
    author_id: uuid.UUID
    share_slug: str | None
    clone_of_id: uuid.UUID | None = None
    is_imported: bool = False
    status: str
    settings: QuizSettings
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    questions: list[QuestionOut] = Field(default_factory=list)
    
    @field_validator("settings", mode="before")
    @classmethod
    def set_default_settings(cls, v):
        return v if v is not None else QuizSettings().model_dump()
        
    model_config = ConfigDict(from_attributes=True)
