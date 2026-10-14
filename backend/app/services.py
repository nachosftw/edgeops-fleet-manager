"""Pure domain rules for FleetOps.

Kept free of FastAPI and SQLAlchemy so the rules can be unit tested and
mutation tested in isolation.
"""

from collections.abc import Iterable, Mapping

STATUSES = ("Online", "Offline", "Maintenance")
LOW_BATTERY = 20
CRITICAL_BATTERY = 10
WEAK_SIGNAL = 30


class DomainError(Exception):
    """A business-rule violation. ``code`` maps to an HTTP status."""

    def __init__(self, message: str, code: int = 409):
        super().__init__(message)
        self.message = message
        self.code = code


def is_valid_ipv4(value: str) -> bool:
    parts = value.split(".")
    if len(parts) != 4:
        return False
    for part in parts:
        if not part.isdigit():
            return False
        if len(part) > 1 and part.startswith("0"):
            return False
        if int(part) > 255:
            return False
    return True


def next_device_id(existing_ids: Iterable[str]) -> str:
    """Return the next ``DEV-NNN`` id. Ids are never reused after a delete."""
    highest = 0
    for device_id in existing_ids:
        prefix, _, number = device_id.partition("-")
        if prefix == "DEV" and number.isdigit():
            highest = max(highest, int(number))
    return f"DEV-{highest + 1:03d}"


def validate_status_change(current: str, new: str, reason_note: str) -> None:
    if new not in STATUSES:
        raise DomainError(f"Unknown status '{new}'", code=422)
    if current == new:
        raise DomainError(f"Device is already {new}")
    if new == "Maintenance" and not reason_note.strip():
        raise DomainError("A reason note is required when moving a device to Maintenance", code=422)


def validate_reboot(status: str) -> None:
    if status == "Offline":
        raise DomainError("Cannot reboot an Offline device: it is unreachable")


def health_of(status: str, battery: int, signal_strength: int) -> str:
    """Classify a device as Healthy, Warning or Critical."""
    if status == "Offline" or battery <= CRITICAL_BATTERY:
        return "Critical"
    if battery < LOW_BATTERY or signal_strength < WEAK_SIGNAL or status == "Maintenance":
        return "Warning"
    return "Healthy"


def build_alerts(devices: Iterable[Mapping]) -> list[dict]:
    alerts = []
    for d in devices:
        if d["status"] == "Offline":
            alerts.append(_alert(d, "critical", "Device is offline"))
        elif d["battery"] <= CRITICAL_BATTERY:
            alerts.append(_alert(d, "critical", f"Battery critically low ({d['battery']}%)"))
        elif d["battery"] < LOW_BATTERY:
            alerts.append(_alert(d, "warning", f"Battery low ({d['battery']}%)"))
        if d["status"] != "Offline" and d["signal_strength"] < WEAK_SIGNAL:
            alerts.append(_alert(d, "warning", f"Weak signal ({d['signal_strength']}%)"))
    alerts.sort(key=lambda a: (a["severity"] != "critical", a["device_id"]))
    return alerts


def _alert(d: Mapping, severity: str, message: str) -> dict:
    return {
        "device_id": d["id"],
        "device_name": d["name"],
        "severity": severity,
        "message": message,
    }


def summarize(devices: list[Mapping]) -> dict:
    total = len(devices)
    counts = {s: 0 for s in STATUSES}
    for d in devices:
        counts[d["status"]] += 1
    avg_battery = round(sum(d["battery"] for d in devices) / total, 1) if total else 0.0
    availability = round(counts["Online"] * 100 / total, 1) if total else 0.0
    return {
        "total": total,
        "online": counts["Online"],
        "offline": counts["Offline"],
        "maintenance": counts["Maintenance"],
        "average_battery": avg_battery,
        "availability_pct": availability,
        "alerts": build_alerts(devices),
    }


def filter_devices(devices: list[Mapping], status: str | None = None, search: str | None = None,
                   device_type: str | None = None) -> list[Mapping]:
    result = list(devices)
    if status:
        result = [d for d in result if d["status"] == status]
    if device_type:
        result = [d for d in result if d["type"] == device_type]
    if search:
        needle = search.strip().lower()
        result = [
            d for d in result
            if needle in d["name"].lower() or needle in d["id"].lower() or needle in d["ip_address"]
        ]
    return result
