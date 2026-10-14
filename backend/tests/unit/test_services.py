"""Unit tests for the pure domain rules in app/services.py."""

import pytest

from app import services
from app.services import DomainError

pytestmark = pytest.mark.unit


def dev(id="DEV-001", name="Rover", status="Online", battery=80, signal=80, type="Rover", ip="10.0.0.1"):
    return {"id": id, "name": name, "status": status, "battery": battery,
            "signal_strength": signal, "type": type, "ip_address": ip}


# --- IPv4 validation -------------------------------------------------------

@pytest.mark.parametrize("ip", ["192.168.1.10", "0.0.0.0", "255.255.255.255", "10.0.0.1"])
def test_valid_ipv4(ip):
    assert services.is_valid_ipv4(ip)


@pytest.mark.parametrize("ip", [
    "256.1.1.1", "1.2.3", "1.2.3.4.5", "a.b.c.d", "1.2.3.-4", "01.2.3.4", "", "1..3.4", "1.2.3.4 ",
])
def test_invalid_ipv4(ip):
    assert not services.is_valid_ipv4(ip)


# --- id generation ---------------------------------------------------------

def test_first_id_is_dev_001():
    assert services.next_device_id([]) == "DEV-001"


def test_next_id_follows_highest_not_count():
    # gap left by a deleted device must not be refilled
    assert services.next_device_id(["DEV-001", "DEV-004"]) == "DEV-005"


def test_next_id_ignores_foreign_ids():
    assert services.next_device_id(["XYZ-900", "DEV-abc", "DEV-002"]) == "DEV-003"


def test_next_id_pads_to_three_digits_and_grows():
    assert services.next_device_id(["DEV-009"]) == "DEV-010"
    assert services.next_device_id(["DEV-999"]) == "DEV-1000"


# --- status transitions ----------------------------------------------------

@pytest.mark.parametrize("current,new", [("Online", "Offline"), ("Offline", "Online"), ("Maintenance", "Online")])
def test_allowed_transitions(current, new):
    services.validate_status_change(current, new, "")


def test_same_status_is_conflict():
    with pytest.raises(DomainError) as exc:
        services.validate_status_change("Online", "Online", "")
    assert exc.value.code == 409
    assert "already Online" in exc.value.message


def test_unknown_status_is_unprocessable():
    with pytest.raises(DomainError) as exc:
        services.validate_status_change("Online", "Exploded", "")
    assert exc.value.code == 422


@pytest.mark.parametrize("note", ["", "   "])
def test_maintenance_requires_reason(note):
    with pytest.raises(DomainError) as exc:
        services.validate_status_change("Online", "Maintenance", note)
    assert exc.value.code == 422


def test_maintenance_with_reason_is_allowed():
    services.validate_status_change("Online", "Maintenance", "Replace wheel motor")


def test_domain_error_defaults_to_conflict():
    assert DomainError("x").code == 409


def test_reboot_rules():
    services.validate_reboot("Online")
    services.validate_reboot("Maintenance")
    with pytest.raises(DomainError):
        services.validate_reboot("Offline")


# --- health classification (boundary values) ------------------------------

@pytest.mark.parametrize("status,battery,signal,expected", [
    ("Online", 80, 80, "Healthy"),
    ("Online", 20, 30, "Healthy"),     # exactly on both thresholds
    ("Online", 19, 80, "Warning"),     # just below low battery
    ("Online", 80, 29, "Warning"),     # just below weak signal
    ("Online", 11, 80, "Warning"),
    ("Online", 10, 80, "Critical"),    # critical battery boundary
    ("Online", 0, 80, "Critical"),
    ("Maintenance", 90, 90, "Warning"),
    ("Offline", 100, 100, "Critical"),
])
def test_health_of(status, battery, signal, expected):
    assert services.health_of(status, battery, signal) == expected


# --- alerts and summary ----------------------------------------------------

def test_alerts_for_offline_device_skip_signal_warning():
    alerts = services.build_alerts([dev(status="Offline", signal=0)])
    assert alerts == [{"device_id": "DEV-001", "device_name": "Rover", "severity": "critical",
                       "message": "Device is offline"}]


def test_alert_levels_for_battery():
    alerts = services.build_alerts([dev(id="DEV-001", battery=10), dev(id="DEV-002", battery=19),
                                    dev(id="DEV-003", battery=20)])
    assert [(a["device_id"], a["severity"]) for a in alerts] == [("DEV-001", "critical"), ("DEV-002", "warning")]
    assert alerts[0]["message"] == "Battery critically low (10%)"
    assert alerts[1]["message"] == "Battery low (19%)"


def test_weak_signal_alert_and_ordering():
    alerts = services.build_alerts([dev(id="DEV-002", signal=29), dev(id="DEV-001", status="Offline")])
    assert [a["severity"] for a in alerts] == ["critical", "warning"]
    assert alerts[1]["message"] == "Weak signal (29%)"
    assert services.build_alerts([dev(signal=30)]) == []


def test_summary_counts_and_averages():
    fleet = [dev(status="Online", battery=100), dev(status="Online", battery=50),
             dev(status="Offline", battery=0), dev(status="Maintenance", battery=55)]
    s = services.summarize(fleet)
    assert (s["total"], s["online"], s["offline"], s["maintenance"]) == (4, 2, 1, 1)
    assert s["average_battery"] == 51.2
    assert s["availability_pct"] == 50.0


def test_summary_of_empty_fleet():
    s = services.summarize([])
    assert s == {"total": 0, "online": 0, "offline": 0, "maintenance": 0,
                 "average_battery": 0.0, "availability_pct": 0.0, "alerts": []}


def test_filter_devices():
    fleet = [dev(id="DEV-001", name="Rover-Alpha", ip="10.0.0.1"),
             dev(id="DEV-002", name="Drone-Beta", status="Offline", type="Drone", ip="10.0.0.2")]
    assert services.filter_devices(fleet) == fleet
    assert [d["id"] for d in services.filter_devices(fleet, status="Offline")] == ["DEV-002"]
    assert [d["id"] for d in services.filter_devices(fleet, device_type="Rover")] == ["DEV-001"]
    assert [d["id"] for d in services.filter_devices(fleet, search="  ALPHA ")] == ["DEV-001"]
    assert [d["id"] for d in services.filter_devices(fleet, search="dev-002")] == ["DEV-002"]
    assert [d["id"] for d in services.filter_devices(fleet, search="10.0.0.2")] == ["DEV-002"]
    assert services.filter_devices(fleet, status="Online", device_type="Drone") == []


# --- added after mutation run #1: kill the 6 surviving mutants ------------

@pytest.mark.parametrize("args,expected", [
    (("Online", "Exploded", ""), "Unknown status 'Exploded'"),
    (("Online", "Online", ""), "Device is already Online"),
    (("Online", "Maintenance", ""), "A reason note is required when moving a device to Maintenance"),
])
def test_status_error_messages_are_exact(args, expected):
    # the UI shows these strings verbatim, so assert equality, not containment
    with pytest.raises(DomainError) as exc:
        services.validate_status_change(*args)
    assert exc.value.message == expected
    assert str(exc.value) == expected


def test_reboot_error_message_is_exact():
    with pytest.raises(DomainError) as exc:
        services.validate_reboot("Offline")
    assert exc.value.message == "Cannot reboot an Offline device: it is unreachable"
    assert exc.value.code == 409


def test_critical_alerts_sort_before_warnings_regardless_of_id():
    alerts = services.build_alerts([dev(id="DEV-001", battery=15), dev(id="DEV-002", status="Offline")])
    assert [(a["device_id"], a["severity"]) for a in alerts] == [("DEV-002", "critical"), ("DEV-001", "warning")]


def test_availability_rounds_to_one_decimal():
    fleet = [dev(status="Online"), dev(status="Offline"), dev(status="Offline")]
    assert services.summarize(fleet)["availability_pct"] == 33.3
