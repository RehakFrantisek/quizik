"""Quizik API — Importer Base Classes."""

from abc import ABC, abstractmethod

from src.schemas.import_job import ImportJobResult


class BaseImporter(ABC):
    """Abstract base class for all file importers."""

    @property
    @abstractmethod
    def supported_extension(self) -> str:
        """Return the lowercase extension, e.g., '.csv'."""
        pass

    @abstractmethod
    def parse(self, file_path: str) -> ImportJobResult:
        """
        Parse the file at the given path and return the structured result
        ready for the quiz review UI.
        """
        pass
