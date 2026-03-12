"""Quizik API — DOCX Importer using python-docx."""

import re
from typing import IO

import docx

from src.importers.base import BaseImporter
from src.schemas.import_job import ImportJobResult, ParsedOption, ParsedQuestionPreview


class DOCXImporter(BaseImporter):
    @property
    def supported_extension(self) -> str:
        return ".docx"

    def parse(self, file_path: str | IO) -> ImportJobResult:
        warnings = []
        parsed = []

        try:
            doc = docx.Document(file_path)
        except Exception as e:
            return ImportJobResult(error=f"Failed to read DOCX: {str(e)}", warnings=[], parsed_questions=[])

        # State machine
        current_question = None
        current_options = []
        
        # Regex for capturing numbered questions (e.g. "1. What is...", "1) Who is...")
        question_re = re.compile(r"^\s*(\d+)[\.\)]\s*(.+)")
        
        # Regex for capturing options (e.g. "a. Paris", "B) London", "- Berlin")
        option_re = re.compile(r"^\s*([a-zA-Z][\.\)]|-|\*)\s*(.+)")

        for i, p in enumerate(doc.paragraphs):
            text = p.text.strip()
            if not text:
                continue

            # Check if paragraph is bold
            is_bold = any(run.bold for run in p.runs)

            q_match = question_re.match(text)
            if q_match:
                # Save previous question
                if current_question:
                    self._finalize_question(current_question, current_options, parsed, warnings)
                
                # Start new question
                current_question = {
                    "body": q_match.group(2).strip() or text, # fallback if group 2 empty
                    "type": "single_choice",
                    "points": 1,
                    "explanation": None
                }
                current_options = []
                continue

            o_match = option_re.match(text)
            if o_match and current_question:
                # If it starts with '*' or is bold we assume it's the correct answer
                is_correct = is_bold or text.startswith("*")
                
                opt_text = o_match.group(2).strip()
                if opt_text.startswith("*"):
                    opt_text = opt_text[1:].strip()
                    is_correct = True
                    
                current_options.append(ParsedOption(
                    id=chr(65 + len(current_options)), # A, B, C
                    text=opt_text,
                    is_correct=is_correct
                ))
            elif current_question:
                # If not matching option regex but we are building a question, treat as explanation or append to body
                if not current_options:
                    current_question["body"] += f"\n{text}"
                else:
                    current_question["explanation"] = (current_question.get("explanation") or "") + f"\n{text}"

        # Finalize the last question
        if current_question:
            self._finalize_question(current_question, current_options, parsed, warnings)

        if not parsed:
            warnings.append("No questions could be parsed from the document format. Ensure questions start with numbers (e.g. '1.') and options with letters (e.g. 'a.')")

        return ImportJobResult(parsed_questions=parsed, warnings=warnings, error=None)

    def _finalize_question(self, q_dict: dict, options: list[ParsedOption], parsed: list, warnings: list) -> None:
        if not options:
            warnings.append(f"Question '{q_dict['body'][:30]}...' had no options and was skipped.")
            return
            
        # Ensure at least one correct answer
        correct_count = sum(1 for o in options if o.is_correct)
        if correct_count == 0:
            options[0].is_correct = True
            warnings.append(f"Question '{q_dict['body'][:30]}...' had no correct option marked. Marked first as correct.")
        elif correct_count > 1:
            q_dict["type"] = "multiple_choice"

        parsed.append(ParsedQuestionPreview(
            type=q_dict["type"],
            body=q_dict["body"].strip(),
            options=options,
            points=q_dict["points"],
            explanation=q_dict["explanation"].strip() if q_dict.get("explanation") else None
        ))
