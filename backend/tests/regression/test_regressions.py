"""Regression suite.

Each test is pinned to a defect found in an earlier release (v0.1.0, the DA1
prototype) or during DA3 development. They run on every commit in CI so a
fixed bug can never silently come back.
"""

import pytest

from tests.conftest import NEW_DEVICE

pytestmark = pytest.mark.regression


def test_RG01_ids_are_not_reused_after_delete(client):
    """v0.1.0 generated ids with len(devices)+1, so deleting a device and adding
    another produced two devices with the same id."""
    for i in range(3):
        client.post("/api/v1/devices", json={**NEW_DEVICE, "ip_address": f"10.0.0.{i + 1}"})
    client.delete("/api/v1/devices/DEV-002")
    r = client.post("/api/v1/devices", json={**NEW_DEVICE, "ip_address": "10.0.0.9"})
    assert r.json()["id"] == "DEV-004"
    ids = [d["id"] for d in client.get("/api/v1/devices").json()]
    assert len(ids) == len(set(ids))


def test_RG02_last_device_id_not_reused_after_delete(client):
    """Variant of RG01 found during DA3: deleting the *highest* id and adding a new
    device must still not hand that id out again."""
    client.post("/api/v1/devices", json=NEW_DEVICE)
    client.delete("/api/v1/devices/DEV-001")
    assert client.post("/api/v1/devices", json=NEW_DEVICE).json()["id"] == "DEV-002"


def test_RG03_unknown_status_rejected(client):
    """DA2 status endpoint accepted any dict, so {'status': 'banana'} was stored."""
    client.post("/api/v1/devices", json=NEW_DEVICE)
    r = client.put("/api/v1/devices/DEV-001/status", json={"status": "banana"})
    assert r.status_code == 422
    assert client.get("/api/v1/devices/DEV-001").json()["status"] == "Online"


def test_RG04_deleting_missing_device_is_404_not_success(client):
    """v0.1.0 returned {'status': 'success'} for ids that did not exist."""
    assert client.delete("/api/v1/devices/DEV-999").status_code == 404


def test_RG05_blank_name_rejected(client):
    """v0.1.0 stored devices with an empty/whitespace name."""
    assert client.post("/api/v1/devices", json={**NEW_DEVICE, "name": "    "}).status_code == 422


def test_RG06_legacy_entrypoint_still_importable():
    """Dockerfile and README use `uvicorn main:app`; the refactor must keep it working."""
    import main

    assert main.app.title == "FleetOps API"


def test_RG07_device_response_contract(client):
    """Frontend depends on these exact fields; removing one breaks the UI."""
    body = client.post("/api/v1/devices", json=NEW_DEVICE).json()
    assert set(body) == {"id", "name", "type", "ip_address", "status", "battery", "signal_strength",
                         "uptime_seconds", "firmware", "location", "created_at", "last_seen", "health"}


def test_RG08_same_status_update_is_conflict_not_silent(client):
    """Re-sending the current status used to write a duplicate audit entry."""
    client.post("/api/v1/devices", json=NEW_DEVICE)
    assert client.put("/api/v1/devices/DEV-001/status", json={"status": "Online"}).status_code == 409
    assert len(client.get("/api/v1/devices/DEV-001/history").json()) == 1
