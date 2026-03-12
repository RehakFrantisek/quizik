"""Quizik API — XLSX Importer using openpyxl."""

import pandas as pd
from typing import IO

from src.importers.base import BaseImporter
from src.schemas.import_job import ImportJobResult


class XLSXImporter(BaseImporter):
    """
    XLSX importer delegates to pandas which uses openpyxl under the hood. 
    This allows us to share 95% of the CSV importer parsing logic.
    """
    
    @property
    def supported_extension(self) -> str:
        return ".xlsx"

    def parse(self, file_path: str | IO) -> ImportJobResult:
        try:
            # We read the first sheet by default
            df = pd.read_excel(file_path, engine="openpyxl", dtype=str).fillna("")
        except Exception as e:
            return ImportJobResult(error=f"Failed to read XLSX: {str(e)}", warnings=[], parsed_questions=[])

        # Delegate to the shared parser logic in CSVImporter
        # (Could extract this to a shared mixin, but instantiating locally keeps it simple for v1)
        from src.importers.csv_importer import CSVImporter
        csv_importer = CSVImporter()
        
        # We temporarily save the df to a CSV in memory to use the exact same logic
        import io
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        
        return csv_importer.parse(csv_buffer)
