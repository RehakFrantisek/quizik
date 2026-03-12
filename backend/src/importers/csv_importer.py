"""Quizik API — CSV Importer using pandas."""

import pandas as pd
from typing import IO

from src.importers.base import BaseImporter
from src.schemas.import_job import ImportJobResult, ParsedOption, ParsedQuestionPreview


class CSVImporter(BaseImporter):
    @property
    def supported_extension(self) -> str:
        return ".csv"

    def parse(self, file_path: str | IO) -> ImportJobResult:
        warnings = []
        parsed = []

        try:
            # Handle string file path or file-like object
            df = pd.read_csv(file_path, dtype=str).fillna("")
        except Exception as e:
            return ImportJobResult(error=f"Failed to read CSV: {str(e)}", warnings=[], parsed_questions=[])

        # Expected columns (case insensitive, somewhat flexible)
        # Type, Question, Option A, Option B, Option C, Option D, Correct, Points, Explanation
        
        # Normalize column headers to lowercase stripped
        df.columns = df.columns.astype(str).str.strip().str.lower()
        
        # Mapping common variations
        col_map = {
            "type": ["type", "question type"],
            "body": ["question", "body", "text"],
            "ok": ["correct", "answer", "correct answer", "correct option"],
            "points": ["points", "score", "weight"],
            "expl": ["explanation", "feedback"],
        }
        
        def _find_col(keys: list[str]) -> str | None:
            for k in keys:
                if k in df.columns:
                    return k
            return None

        c_type = _find_col(col_map["type"])
        c_body = _find_col(col_map["body"])
        c_ok = _find_col(col_map["ok"])
        
        # Option columns: look for anything containing "option" or single letters A-E
        option_cols = [c for c in df.columns if "option" in c or c in ["a", "b", "c", "d", "e"]]

        if not c_body or not c_ok:
            return ImportJobResult(error="Missing required columns: 'Question' and 'Correct'", warnings=[], parsed_questions=[])

        c_points = _find_col(col_map["points"])
        c_expl = _find_col(col_map["expl"])

        for idx, row in df.iterrows():
            row_num = idx + 2 # 1-based + 1 for header
            
            body = str(row[c_body]).strip()
            if not body:
                warnings.append(f"Row {row_num}: Empty question body skipped.")
                continue
                
            correct_raw = str(row[c_ok]).strip().lower()
            correct_keys = [k.strip() for k in correct_raw.split(",")] if "," in correct_raw else [correct_raw]
            
            # Determine type or default to single_choice
            q_type = str(row[c_type]).strip().lower() if c_type else "single_choice"
            if q_type not in ["single_choice", "multiple_choice", "true_false", "short_answer"]:
                q_type = "single_choice"
                
            # Parse points
            try:
                points = int(row[c_points]) if c_points and row[c_points] else 1
            except ValueError:
                points = 1
                warnings.append(f"Row {row_num}: Invalid points '{row[c_points]}', defaulted to 1.")

            explanation = str(row[c_expl]).strip() if c_expl else None

            # Build options
            options = []
            
            if q_type == "true_false":
                is_true_correct = correct_raw in ["true", "t", "yes", "y", "1", "pravda", "ano"]
                options = [
                    ParsedOption(id="A", text="True", is_correct=is_true_correct),
                    ParsedOption(id="B", text="False", is_correct=not is_true_correct),
                ]
            elif q_type == "short_answer":
                # For short answer, "Correct" column holds the exact accepted strings
                options = [ParsedOption(id=str(i), text=ans, is_correct=True) for i, ans in enumerate(correct_keys) if ans]
            else:
                # Multiple or Single Choice
                char_base = 65 # 'A'
                for o_idx, o_col in enumerate(option_cols):
                    opt_text = str(row[o_col]).strip()
                    if not opt_text:
                        continue
                    
                    letter_id = chr(char_base + o_idx)
                    
                    # Correct if:
                    # 1. The option text exactly matches the Correct column
                    # 2. The option letter (A, B, C...) matches the Correct column
                    # 3. The column name matches the Correct column
                    is_correct = (
                        opt_text.lower() in correct_keys or
                        letter_id.lower() in correct_keys or
                        o_col in correct_keys
                    )
                    
                    options.append(ParsedOption(id=letter_id, text=opt_text, is_correct=is_correct))
                    
                if not options:
                    warnings.append(f"Row {row_num}: No options found for choice question.")
                    continue
                    
                # Auto-upgrade to multiple choice if multiple correct answers were flagged
                correct_count = sum(1 for o in options if o.is_correct)
                if correct_count > 1 and q_type == "single_choice":
                    q_type = "multiple_choice"
                elif correct_count == 0:
                    warnings.append(f"Row {row_num}: No correct option identified. Marked first as correct to prevent errors.")
                    if options:
                        options[0].is_correct = True

            parsed.append(ParsedQuestionPreview(
                type=q_type,
                body=body,
                options=options,
                points=points,
                explanation=explanation
            ))

        return ImportJobResult(parsed_questions=parsed, warnings=warnings, error=None)
