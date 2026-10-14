"""Integration with a real on-disk SQLite file: data must survive an application restart."""

import pytest

from tests.conftest import NEW_DEVICE, make_client

pytestmark = pytest.mark.integration


def test_data_survives_restart(tmp_path):
    url = f"sqlite:///{tmp_path / 'fleet.db'}"
    with make_client(url) as first:
        first.post("/api/v1/devices", json=NEW_DEVICE)
        first.put("/api/v1/devices/DEV-001/status", json={"status": "Offline", "reason_note": "Shipped"})

    with make_client(url) as second:
        device = second.get("/api/v1/devices/DEV-001").json()
        assert device["status"] == "Offline"
        assert len(second.get("/api/v1/devices/DEV-001/history").json()) == 2


def test_seed_runs_only_once(tmp_path):
    url = f"sqlite:///{tmp_path / 'fleet.db'}"
    with make_client(url, seed=True) as first:
        first.delete("/api/v1/devices/DEV-001")
    with make_client(url, seed=True) as second:
        ids = [d["id"] for d in second.get("/api/v1/devices").json()]
        assert "DEV-001" not in ids
        assert len(ids) == 5
