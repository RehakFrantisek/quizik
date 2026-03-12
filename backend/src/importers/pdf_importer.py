"""Quizik API — PDF Importer using pdfplumber."""

from typing import IO

import pdfplumber

from src.importers.base import BaseImporter
from src.schemas.import_job import ImportJobResult


class PDFImporter(BaseImporter):
    @property
    def supported_extension(self) -> str:
        return ".pdf"

    def parse(self, file_path: str | IO) -> ImportJobResult:
        warnings = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                full_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        full_text.append(text)
                
                raw_text = "\n".join(full_text)
                
        except Exception as e:
            return ImportJobResult(error=f"Failed to read PDF: {str(e)}", warnings=[], parsed_questions=[])

        if not raw_text.strip():
            return ImportJobResult(
                error="No text could be extracted from this PDF. It might be a scanned image.",
                warnings=[],
                parsed_questions=[]
            )

        # Delegate parsing the extracted raw text to the DOCX logic, simulating paragraphs
        from src.importers.docx_importer import DOCXImporter
        
        # Create a mock python-docx document structure
        class MockRun:
            def __init__(self, bold=False):
                self.bold = bold
                
        class MockParagraph:
            def __init__(self, text: str):
                self.text = text
                # We can't detect bold in raw text easily, so we rely on '*' prefixes finding
                self.runs = [MockRun(bold=False)]
                
        class MockDoc:
            def __init__(self, text: str):
                self.paragraphs = [MockParagraph(line) for line in text.split("\n")]
        
        mock_doc = MockDoc(raw_text)
        
        # Temporarily patch DOCXImporter to read our mock doc instead of opening a file
        docx_importer = DOCXImporter()
        
        # We need to manually execute the inner logic of DOCXImporter.parse
        # since it expects a file path. We'll duplicate the state machine here
        # to avoid messy monkey-patching.
        
        import re
        from src.schemas.import_job import ParsedOption, ParsedQuestionPreview
        
        parsed = []
        current_question = None
        current_options = []
        
        question_re = re.compile(r"^\s*(\d+)[\.\)]\s*(.+)")
        option_re = re.compile(r"^\s*([a-zA-Z][\.\)]|-|\*)\s*(.+)")

        for p in mock_doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            q_match = question_re.match(text)
            if q_match:
                if current_question:
                    docx_importer._finalize_question(current_question, current_options, parsed, warnings)
                
                current_question = {
                    "body": q_match.group(2).strip() or text,
                    "type": "single_choice",
                    "points": 1,
                    "explanation": None
                }
                current_options = []
                continue

            o_match = option_re.match(text)
            if o_match and current_question:
                is_correct = text.startswith("*")  # PDFs lose bold formatting, rely on *
                
                opt_text = o_match.group(2).strip()
                if opt_text.startswith("*"):
                    opt_text = opt_text[1:].strip()
                    is_correct = True
                    
                current_options.append(ParsedOption(
                    id=chr(65 + len(current_options)),
                    text=opt_text,
                    is_correct=is_correct
                ))
            elif current_question:
                if not current_options:
                    current_question["body"] += f"\n{text}"
                else:
                    current_question["explanation"] = (current_question.get("explanation") or "") + f"\n{text}"

        if current_question:
            docx_importer._finalize_question(current_question, current_options, parsed, warnings)

        if not parsed:
            warnings.append("No questions could be parsed from the PDF text. Ensure questions start with numbers (e.g. '1.') and correct options are prefixed with '*'.")

        return ImportJobResult(parsed_questions=parsed, warnings=warnings, error=None)
