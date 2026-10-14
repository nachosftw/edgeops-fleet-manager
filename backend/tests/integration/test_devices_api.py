"""Integration tests: HTTP layer + validation + data-access layer + SQLite together."""

import pytest

pytestmark = pytest.mark.integration


def test_health_endpoint(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "version": "1.0.0"}


def test_empty_fleet_lists_nothing(client):
    assert client.get("/api/v1/devices").json() == []


def test_register_then_fetch_device(client, new_device):
    r = client.post("/api/v1/devices", json=new_device)
    assert r.status_code == 201
    body = r.json()
    assert body["id"] == "DEV-001"
    assert body["health"] == "Healthy"
    assert body["location"] == "Unassigned"

    fetched = client.get("/api/v1/devices/DEV-001")
    assert fetched.status_code == 200
    assert fetched.json()["ip_address"] == "10.0.0.21"
    assert [d["id"] for d in client.get("/api/v1/devices").json()] == ["DEV-001"]


@pytest.mark.parametrize("field,value", [
    ("ip_address", "300.1.1.1"),
    ("ip_address", "not-an-ip"),
    ("name", "x"),
    ("name", "   "),
    ("type", "Spaceship"),
    ("status", "Sleeping"),
])
def test_register_rejects_invalid_payload(client, new_device, field, value):
    r = client.post("/api/v1/devices", json={**new_device, field: value})
    assert r.status_code == 422
    assert client.get("/api/v1/devices").json() == []


def test_register_rejects_duplicate_ip(client, new_device):
    client.post("/api/v1/devices", json=new_device)
    r = client.post("/api/v1/devices", json={**new_device, "name": "Other"})
    assert r.status_code == 409
    assert "already assigned to DEV-001" in r.json()["detail"]


def test_unknown_device_returns_404(client):
    for method, path in [("get", "/api/v1/devices/DEV-404"), ("delete", "/api/v1/devices/DEV-404"),
                         ("get", "/api/v1/devices/DEV-404/history"), ("post", "/api/v1/devices/DEV-404/reboot")]:
        r = getattr(client, method)(path)
        assert r.status_code == 404, path
        assert r.json()["detail"] == "Device DEV-404 not found"


def test_status_update_flow_writes_audit_trail(client, new_device):
    client.post("/api/v1/devices", json=new_device)
    r = client.put("/api/v1/devices/DEV-001/status", json={"status": "Maintenance", "reason_note": "Motor swap"})
    assert r.status_code == 200
    assert r.json()["status"] == "Maintenance"
    assert r.json()["health"] == "Warning"

    history = client.get("/api/v1/devices/DEV-001/history").json()
    assert [(h["event"], h["old_status"], h["new_status"]) for h in history] == [
        ("STATUS_CHANGE", "Online", "Maintenance"),
        ("REGISTERED", None, "Online"),
    ]
    assert history[0]["reason_note"] == "Motor swap"


def test_status_update_rules_enforced_over_http(client, new_device):
    client.post("/api/v1/devices", json=new_device)
    same = client.put("/api/v1/devices/DEV-001/status", json={"status": "Online"})
    assert same.status_code == 409
    no_reason = client.put("/api/v1/devices/DEV-001/status", json={"status": "Maintenance"})
    assert no_reason.status_code == 422
    assert client.get("/api/v1/devices/DEV-001").json()["status"] == "Online"


def test_going_offline_resets_uptime(seeded_client):
    r = seeded_client.put("/api/v1/devices/DEV-001/status", json={"status": "Offline"})
    assert r.json()["uptime_seconds"] == 0
    assert r.json()["health"] == "Critical"


def test_reboot(seeded_client):
    r = seeded_client.post("/api/v1/devices/DEV-004/reboot")  # Maintenance device
    assert r.status_code == 200
    assert r.json()["status"] == "Online"
    assert r.json()["uptime_seconds"] == 0
    assert seeded_client.get("/api/v1/devices/DEV-004/history").json()[0]["event"] == "REBOOT"

    offline = seeded_client.post("/api/v1/devices/DEV-002/reboot")
    assert offline.status_code == 409


def test_telemetry_ingestion_updates_health(client, new_device):
    client.post("/api/v1/devices", json=new_device)
    reading = {"battery": 8, "signal_strength": 60, "uptime_seconds": 120}
    r = client.post("/api/v1/devices/DEV-001/telemetry", json=reading)
    assert r.status_code == 200
    assert (r.json()["battery"], r.json()["uptime_seconds"], r.json()["health"]) == (8, 120, "Critical")
    bad = client.post("/api/v1/devices/DEV-001/telemetry", json={"battery": 101, "signal_strength": 60})
    assert bad.status_code == 422


def test_delete_removes_device_but_keeps_history_tombstone(client, new_device):
    client.post("/api/v1/devices", json=new_device)
    r = client.delete("/api/v1/devices/DEV-001")
    assert r.status_code == 204
    assert r.content == b""
    assert client.get("/api/v1/devices/DEV-001").status_code == 404
    # the IP is released and can be reused by a new device
    assert client.post("/api/v1/devices", json=new_device).status_code == 201


def test_list_filters(seeded_client):
    def ids(query):
        return [d["id"] for d in seeded_client.get(f"/api/v1/devices{query}").json()]

    assert len(ids("")) == 6
    assert ids("?status=Offline") == ["DEV-002"]
    assert ids("?type=Rover") == ["DEV-001", "DEV-005"]
    assert ids("?search=gamma") == ["DEV-003"]
    assert ids("?status=Online&type=Rover") == ["DEV-001", "DEV-005"]
    assert seeded_client.get("/api/v1/devices?status=Broken").status_code == 422


def test_fleet_summary_tracks_changes(seeded_client):
    s = seeded_client.get("/api/v1/fleet/summary").json()
    assert (s["total"], s["online"], s["offline"], s["maintenance"]) == (6, 4, 1, 1)
    assert {a["device_id"] for a in s["alerts"]} == {"DEV-002", "DEV-003", "DEV-005"}

    seeded_client.put("/api/v1/devices/DEV-002/status", json={"status": "Online"})
    seeded_client.delete("/api/v1/devices/DEV-006")
    s = seeded_client.get("/api/v1/fleet/summary").json()
    assert (s["total"], s["online"], s["offline"]) == (5, 4, 0)


def test_cors_headers_present_for_frontend(client):
    r = client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
    assert r.headers["access-control-allow-origin"] == "*"


def test_openapi_documents_all_endpoints(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert {"/api/v1/devices", "/api/v1/devices/{device_id}", "/api/v1/devices/{device_id}/status",
            "/api/v1/devices/{device_id}/reboot", "/api/v1/devices/{device_id}/history",
            "/api/v1/devices/{device_id}/telemetry", "/api/v1/fleet/summary", "/api/v1/health"} <= set(paths)
