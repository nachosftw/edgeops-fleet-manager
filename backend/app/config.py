"""Runtime configuration, read from environment variables."""

import os
from dataclasses import dataclass, field


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./fleetops.db")
    )
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    cors_origins: list[str] = field(
        default_factory=lambda: _split(os.getenv("CORS_ORIGINS", "*"))
    )
    seed_demo_data: bool = field(
        default_factory=lambda: os.getenv("SEED_DEMO_DATA", "true").lower() == "true"
    )


def get_settings() -> Settings:
    return Settings()
