"""Quizik API — Test configuration and shared fixtures."""

import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"


# Database fixtures, factories, and test client will be added in Phase 9.
