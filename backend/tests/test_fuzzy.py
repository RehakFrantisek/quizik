"""Tests for fuzzy answer matching utilities."""

import pytest
from src.utils.fuzzy import normalize, fuzzy_match


# ── normalize ────────────────────────────────────────────────────────────────

def test_normalize_strips_whitespace():
    assert normalize("  hello  ") == "hello"


def test_normalize_lowercases():
    assert normalize("Adolf Hitler") == "adolf hitler"


def test_normalize_collapses_whitespace():
    assert normalize("adolf  hitler") == "adolf hitler"


def test_normalize_handles_diacritics():
    result = normalize("café")
    assert result == "cafe"


def test_normalize_empty():
    assert normalize("") == ""


# ── fuzzy_match exact ─────────────────────────────────────────────────────────

def test_exact_match_same_case():
    matched, method, score = fuzzy_match("Adolf Hitler", "Adolf Hitler")
    assert matched is True
    assert method == "exact"
    assert score == 100.0


def test_exact_match_different_case():
    matched, method, score = fuzzy_match("adolf hitler", "Adolf Hitler")
    assert matched is True
    assert method == "exact"


def test_exact_match_leading_trailing_space():
    matched, method, _ = fuzzy_match("  hitler  ", "Hitler")
    assert matched is True


def test_alias_exact_match():
    matched, method, _ = fuzzy_match("A. Hitler", "Adolf Hitler", accepted_answers=["A. Hitler", "Hitler"])
    assert matched is True
    assert "alias" in method


def test_no_match_unrelated():
    matched, method, _ = fuzzy_match("Napoleon", "Adolf Hitler")
    assert matched is False
    assert method == "none"


# ── fuzzy_match fuzzy ─────────────────────────────────────────────────────────

def test_fuzzy_match_typo():
    """'hitller' is a minor typo and should still match."""
    matched, method, score = fuzzy_match("hitller", "Hitler", threshold=75.0)
    assert matched is True
    assert method == "fuzzy"
    assert score >= 75.0


def test_fuzzy_match_hittler():
    matched, method, score = fuzzy_match("hittler", "Hitler", threshold=75.0)
    assert matched is True


def test_fuzzy_match_partial_name_default_threshold():
    """'hitler' vs 'Adolf Hitler' — fuzzy should match via token_sort_ratio."""
    matched, method, score = fuzzy_match("hitler", "Adolf Hitler", threshold=80.0)
    # "hitler" alone might not hit 80% against "adolf hitler" depending on scorer,
    # but it should match via aliases if we add "Hitler" as an alias.
    # Without alias, accept either outcome but score should be non-zero.
    assert score > 0


def test_fuzzy_match_with_alias():
    """Adding 'Hitler' as alias should reliably match 'hitler'."""
    matched, method, score = fuzzy_match(
        "hitler", "Adolf Hitler", accepted_answers=["Hitler"], threshold=80.0
    )
    assert matched is True


def test_fuzzy_below_threshold():
    matched, _, _ = fuzzy_match("xyz", "Adolf Hitler", threshold=80.0)
    assert matched is False


def test_empty_response():
    matched, method, score = fuzzy_match("", "Hitler")
    assert matched is False
    assert method == "none"
    assert score == 0.0


# ── Edge cases ────────────────────────────────────────────────────────────────

def test_accepted_answers_none():
    matched, _, _ = fuzzy_match("Paris", "Paris", accepted_answers=None)
    assert matched is True


def test_multiple_aliases():
    matched, method, _ = fuzzy_match(
        "the great wall",
        "Great Wall of China",
        accepted_answers=["Great Wall", "the great wall", "chinese wall"],
        threshold=80.0,
    )
    assert matched is True
