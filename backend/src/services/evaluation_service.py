"""Quizik API — Answer evaluation service.

Handles:
- short_answer: normalization + alias matching + fuzzy matching
- single_choice / true_false: exact option id comparison
- multiple_choice: set comparison
"""

from src.models.question import Question
from src.utils.fuzzy import fuzzy_match

# Fuzzy threshold; can be overridden per-question in future via question.settings
_DEFAULT_FUZZY_THRESHOLD = 80.0


def evaluate_answer(question: Question, response) -> tuple[bool, int]:
    """Evaluate a participant response against the question.

    Returns:
        (is_correct, points_awarded)
    """
    qtype = question.type

    if qtype == "short_answer":
        return _evaluate_short_answer(question, response)
    elif qtype in ("single_choice", "true_false"):
        return _evaluate_single_choice(question, response)
    elif qtype == "multiple_choice":
        return _evaluate_multiple_choice(question, response)

    # Unknown type: no points
    return False, 0


def _correct_option_ids(question: Question) -> set[str]:
    return {opt["id"] for opt in question.options if opt.get("is_correct")}


def _evaluate_single_choice(question: Question, response) -> tuple[bool, int]:
    correct = _correct_option_ids(question)
    selected = str(response).strip() if response is not None else ""
    is_correct = selected in correct
    return is_correct, question.points if is_correct else 0


def _evaluate_multiple_choice(question: Question, response) -> tuple[bool, int]:
    correct = _correct_option_ids(question)
    if isinstance(response, list):
        selected = set(str(r).strip() for r in response)
    elif isinstance(response, str):
        selected = {response.strip()}
    else:
        selected = set()
    is_correct = selected == correct
    return is_correct, question.points if is_correct else 0


def _evaluate_short_answer(question: Question, response) -> tuple[bool, int]:
    if response is None:
        return False, 0

    user_text = str(response).strip()
    if not user_text:
        return False, 0

    # Find the correct answer from options
    correct_texts: list[str] = [
        opt["text"] for opt in question.options if opt.get("is_correct")
    ]
    if not correct_texts:
        # No configured correct answer — mark for manual review
        return False, 0

    primary_correct = correct_texts[0]
    aliases: list[str] = list(question.accepted_answers or [])

    matched, _method, _score = fuzzy_match(
        user_answer=user_text,
        correct_answer=primary_correct,
        accepted_answers=aliases if aliases else None,
        threshold=_DEFAULT_FUZZY_THRESHOLD,
    )

    return matched, question.points if matched else 0
