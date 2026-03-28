"""Quizik API — Session, attempt, and answer review schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ── QuizSession schemas ────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    quiz_id: uuid.UUID
    title: str | None = Field(default=None, max_length=255)
    group_id: uuid.UUID | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    leaderboard_enabled: bool = True
    gamification_enabled: bool = False
    minigame_type: str = Field(default="tap_sprint", pattern="^(tap_sprint|typing_race|slider|random|memory_pairs)$")
    minigame_config: dict | None = None
    minigame_trigger_mode: str = Field(default="every_n", pattern="^(every_n|streak|random)$")
    minigame_trigger_n: int = Field(default=3, ge=1, le=50)
    allow_repeat: bool = True
    max_repeats: int = Field(default=0, ge=0, le=1000)
    show_correct_answer: bool = True
    question_count: int = Field(default=0, ge=0)
    shuffle_questions: bool | None = None
    shuffle_options: bool | None = None
    anticheat_enabled: bool = False
    anticheat_tab_switch: bool = False
    anticheat_fast_answer: bool = False
    bonuses_enabled: bool = False
    bonus_eliminate: bool = False
    bonus_second_chance: bool = False
    bonus_end_correction: bool = False
    bonus_unlock_mode: str = Field(default="immediate", pattern="^(immediate|after_x|random)$")
    bonus_unlock_x: int = Field(default=3, ge=1, le=100)


class SessionUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    status: str | None = Field(default=None, pattern="^(scheduled|active|closed|archived)$")
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    leaderboard_enabled: bool | None = None
    gamification_enabled: bool | None = None
    minigame_type: str | None = Field(default=None, pattern="^(tap_sprint|typing_race|slider|random|memory_pairs)$")
    minigame_config: dict | None = None
    minigame_trigger_mode: str | None = Field(default=None, pattern="^(every_n|streak|random)$")
    minigame_trigger_n: int | None = Field(default=None, ge=1, le=50)
    allow_repeat: bool | None = None
    max_repeats: int | None = Field(default=None, ge=0, le=1000)
    show_correct_answer: bool | None = None
    question_count: int | None = Field(default=None, ge=0)
    shuffle_questions: bool | None = None
    shuffle_options: bool | None = None
    anticheat_enabled: bool | None = None
    anticheat_tab_switch: bool | None = None
    anticheat_fast_answer: bool | None = None
    bonuses_enabled: bool | None = None
    bonus_eliminate: bool | None = None
    bonus_second_chance: bool | None = None
    bonus_end_correction: bool | None = None
    bonus_unlock_mode: str | None = Field(default=None, pattern="^(immediate|after_x|random)$")
    bonus_unlock_x: int | None = Field(default=None, ge=1, le=100)


class SessionOut(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    owner_id: uuid.UUID
    group_id: uuid.UUID | None
    title: str | None
    quiz_title: str | None = None  # add this line
    session_slug: str
    status: str
    starts_at: datetime | None
    ends_at: datetime | None
    leaderboard_enabled: bool
    gamification_enabled: bool
    minigame_type: str = "tap_sprint"
    minigame_config: dict | None = None
    minigame_trigger_mode: str = "every_n"
    minigame_trigger_n: int = 3
    allow_repeat: bool
    max_repeats: int = 0
    show_correct_answer: bool
    question_count: int = 0
    shuffle_questions: bool | None = None
    shuffle_options: bool | None = None
    anticheat_enabled: bool = False
    anticheat_tab_switch: bool = False
    anticheat_fast_answer: bool = False
    bonuses_enabled: bool = False
    bonus_eliminate: bool = False
    bonus_second_chance: bool = False
    bonus_end_correction: bool = False
    bonus_unlock_mode: str = "immediate"
    bonus_unlock_x: int = 3
    created_at: datetime
    updated_at: datetime
    attempt_count: int = 0  # computed on read

    model_config = ConfigDict(from_attributes=True)


# ── Answer review schemas ──────────────────────────────────────────────────────

class AnswerOut(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    response: str | list | dict | None
    is_correct: bool
    points_awarded: int
    points_override: int | None
    override_reason: str | None
    override_at: datetime | None
    time_spent_sec: int | None

    model_config = ConfigDict(from_attributes=True)


class ScoreOverrideRequest(BaseModel):
    points_override: int = Field(ge=0, le=10000)
    reason: str | None = Field(default=None, max_length=500)


# ── Attempt schemas ────────────────────────────────────────────────────────────

class AttemptSummary(BaseModel):
    id: uuid.UUID
    participant_name: str
    status: str
    score: int | None
    max_score: int | None
    percentage: float | None
    started_at: datetime
    completed_at: datetime | None
    hidden_from_leaderboard: bool

    model_config = ConfigDict(from_attributes=True)


class TelemetryEventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    payload: dict | None
    client_ts: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttemptDetail(AttemptSummary):
    answers: list[AnswerOut] = Field(default_factory=list)
    telemetry_events: list[TelemetryEventOut] = Field(default_factory=list)
    partial_answers: dict | None = None
