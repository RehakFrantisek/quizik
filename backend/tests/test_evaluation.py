"""Tests for answer evaluation service."""

import pytest
from unittest.mock import MagicMock
from src.services.evaluation_service import evaluate_answer


def make_question(qtype, options=None, accepted_answers=None, points=5):
    q = MagicMock()
    q.type = qtype
    q.options = options or []
    q.accepted_answers = accepted_answers
    q.points = points
    return q


# ── single_choice ─────────────────────────────────────────────────────────────

def test_single_choice_correct():
    q = make_question(
        "single_choice",
        options=[
            {"id": "a", "text": "Paris", "is_correct": True},
            {"id": "b", "text": "London", "is_correct": False},
        ],
    )
    is_correct, points = evaluate_answer(q, "a")
    assert is_correct is True
    assert points == 5


def test_single_choice_wrong():
    q = make_question(
        "single_choice",
        options=[
            {"id": "a", "text": "Paris", "is_correct": True},
            {"id": "b", "text": "London", "is_correct": False},
        ],
    )
    is_correct, points = evaluate_answer(q, "b")
    assert is_correct is False
    assert points == 0


# ── multiple_choice ───────────────────────────────────────────────────────────

def test_multiple_choice_exact_set():
    q = make_question(
        "multiple_choice",
        options=[
            {"id": "a", "text": "A", "is_correct": True},
            {"id": "b", "text": "B", "is_correct": True},
            {"id": "c", "text": "C", "is_correct": False},
        ],
    )
    is_correct, points = evaluate_answer(q, ["a", "b"])
    assert is_correct is True


def test_multiple_choice_partial_wrong():
    q = make_question(
        "multiple_choice",
        options=[
            {"id": "a", "text": "A", "is_correct": True},
            {"id": "b", "text": "B", "is_correct": True},
            {"id": "c", "text": "C", "is_correct": False},
        ],
    )
    is_correct, _ = evaluate_answer(q, ["a"])
    assert is_correct is False


# ── short_answer ──────────────────────────────────────────────────────────────

def test_short_answer_exact():
    q = make_question(
        "short_answer",
        options=[{"id": "a", "text": "Adolf Hitler", "is_correct": True}],
    )
    is_correct, points = evaluate_answer(q, "Adolf Hitler")
    assert is_correct is True
    assert points == 5


def test_short_answer_case_insensitive():
    q = make_question(
        "short_answer",
        options=[{"id": "a", "text": "Adolf Hitler", "is_correct": True}],
    )
    is_correct, _ = evaluate_answer(q, "adolf hitler")
    assert is_correct is True


def test_short_answer_typo_fuzzy():
    q = make_question(
        "short_answer",
        options=[{"id": "a", "text": "Hitler", "is_correct": True}],
    )
    is_correct, _ = evaluate_answer(q, "hitller")
    assert is_correct is True


def test_short_answer_alias():
    q = make_question(
        "short_answer",
        options=[{"id": "a", "text": "Adolf Hitler", "is_correct": True}],
        accepted_answers=["Hitler", "A. Hitler"],
    )
    is_correct, _ = evaluate_answer(q, "Hitler")
    assert is_correct is True


def test_short_answer_completely_wrong():
    q = make_question(
        "short_answer",
        options=[{"id": "a", "text": "Adolf Hitler", "is_correct": True}],
    )
    is_correct, points = evaluate_answer(q, "Napoleon")
    assert is_correct is False
    assert points == 0


def test_short_answer_empty():
    q = make_question(
        "short_answer",
        options=[{"id": "a", "text": "Adolf Hitler", "is_correct": True}],
    )
    is_correct, points = evaluate_answer(q, "")
    assert is_correct is False
    assert points == 0


def test_short_answer_none():
    q = make_question(
        "short_answer",
        options=[{"id": "a", "text": "Adolf Hitler", "is_correct": True}],
    )
    is_correct, points = evaluate_answer(q, None)
    assert is_correct is False
    assert points == 0
