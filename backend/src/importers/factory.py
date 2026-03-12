"""Quizik API — Importer Factory."""

from typing import Type

from src.exceptions import AppException
from src.importers.base import BaseImporter

# Importers are imported lazily to avoid heavy dependencies on startup
# unless the specific format is required.

__importers: dict[str, str] = {
    ".csv": "src.importers.csv_importer.CSVImporter",
    ".xlsx": "src.importers.xlsx_importer.XLSXImporter",
    ".docx": "src.importers.docx_importer.DOCXImporter",
    ".pdf": "src.importers.pdf_importer.PDFImporter",
}


def _load_importer_class(import_path: str) -> Type[BaseImporter]:
    """Dynamically load an Importer class from its module path."""
    import importlib

    module_name, class_name = import_path.rsplit(".", 1)
    module = importlib.import_module(module_name)
    return getattr(module, class_name)


def get_importer(extension: str) -> BaseImporter:
    """Return the instantiated importer for a given extension."""
    import_path = __importers.get(extension.lower())
    if not import_path:
        raise AppException(
            status_code=415,
            code="UNSUPPORTED_MEDIA_TYPE",
            message=f"No importer found for extension '{extension}'",
        )

    importer_cls = _load_importer_class(import_path)
    return importer_cls()
