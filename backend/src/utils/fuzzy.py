"""Quizik — Fuzzy answer matching utilities.

Strategy (layered, deterministic, explainable):
  1. Normalize both sides (lowercase, strip, collapse whitespace)
  2. Exact match against correct answer and all accepted_answers aliases
  3. Fuzzy match via RapidFuzz token_sort_ratio + ratio
     - Threshold is configurable; defaults to 80 out of 100
  4. Returns (matched: bool, method: str, score: float)

Callers can inspect `method` and `score` for audit/review purposes.
"""

import re
import unicodedata

try:
    from rapidfuzz import fuzz as _fuzz

    _RAPIDFUZZ_AVAILABLE = True
except ImportError:  # pragma: no cover
    _RAPIDFUZZ_AVAILABLE = False


# ── Normalization ─────────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    """Lowercase, strip, collapse whitespace, remove diacritics (best-effort)."""
    # NFC → NFKD to split diacritics, then drop combining marks
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_approx = "".join(ch for ch in nfkd if not unicodedata.combining(ch))
    lowered = ascii_approx.lower().strip()
    # Collapse multiple whitespace characters
    return re.sub(r"\s+", " ", lowered)


# ── Core matching ─────────────────────────────────────────────────────────────

def fuzzy_match(
    user_answer: str,
    correct_answer: str,
    accepted_answers: list[str] | None = None,
    threshold: float = 80.0,
) -> tuple[bool, str, float]:
    """Determine whether user_answer matches correct_answer (or an alias).

    Returns:
        (matched, method, score)
        - matched: bool
        - method: "exact" | "alias_exact" | "fuzzy" | "none"
        - score: 0.0–100.0 (100 = perfect)
    """
    norm_user = normalize(user_answer)
    if not norm_user:
        return False, "none", 0.0

    norm_correct = normalize(correct_answer)
    candidates: list[tuple[str, str]] = [
        (norm_correct, "exact"),
    ]
    if accepted_answers:
        for alias in accepted_answers:
            candidates.append((normalize(alias), "alias_exact"))

    # Step 1: exact match
    for candidate, label in candidates:
        if norm_user == candidate:
            return True, label, 100.0

    # Step 2: fuzzy match (requires rapidfuzz)
    if not _RAPIDFUZZ_AVAILABLE:
        return False, "none", 0.0

    best_score = 0.0
    for candidate, _ in candidates:
        # token_sort_ratio handles word-order variance ("hitler adolf" vs "adolf hitler")
        score_token = _fuzz.token_sort_ratio(norm_user, candidate)
        # plain ratio for tight short-string matching
        score_ratio = _fuzz.ratio(norm_user, candidate)
        score = max(score_token, score_ratio)
        if score > best_score:
            best_score = score

    if best_score >= threshold:
        return True, "fuzzy", best_score

    return False, "none", best_score
