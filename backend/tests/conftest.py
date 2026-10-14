import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

NEW_DEVICE = {"name": "Rover-Theta", "type": "Rover", "ip_address": "10.0.0.21", "status": "Online"}


def make_client(database_url: str = "sqlite://", seed: bool = False) -> TestClient:
    settings = Settings(database_url=database_url, environment="test", cors_origins=["*"], seed_demo_data=seed)
    return TestClient(create_app(settings))


@pytest.fixture
def client():
    """Empty fleet backed by a fresh in-memory SQLite database."""
    with make_client() as c:
        yield c


@pytest.fixture
def seeded_client():
    """Fleet pre-loaded with the six demo devices."""
    with make_client(seed=True) as c:
        yield c


@pytest.fixture
def new_device():
    return dict(NEW_DEVICE)
