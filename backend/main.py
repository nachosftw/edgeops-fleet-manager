"""Entry point kept for backwards compatibility: ``uvicorn main:app``."""

from app.main import app  # noqa: F401
