"""Quizik API — Question schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class QuestionOption(BaseModel):
    id: str
    text: str
    is_correct: bool

class QuestionBase(BaseModel):
    type: str = Field(pattern="^(single_choice|multiple_choice|true_false|short_answer)$")
    body: str = Field(max_length=5000)
    explanation: str | None = None
    options: list[QuestionOption] = Field(default_factory=list, max_length=10)
    points: int = Field(default=1, ge=1, le=100)

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    type: str | None = Field(pattern="^(single_choice|multiple_choice|true_false|short_answer)$", default=None)
    body: str | None = Field(max_length=5000, default=None)
    explanation: str | None = None
    options: list[QuestionOption] | None = Field(max_length=10, default=None)
    points: int | None = Field(ge=1, le=100, default=None)

class QuestionOut(QuestionBase):
    id: uuid.UUID
    quiz_id: uuid.UUID
    position: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class QuestionReorder(BaseModel):
    question_ids: list[uuid.UUID]
