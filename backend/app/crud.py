"""Data-access layer: every database read/write goes through here."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import services
from .models import Device, StatusLog, utcnow
from .schemas import DeviceCreate, TelemetryUpdate


class NotFound(Exception):
    pass


def to_dict(device: Device) -> dict:
    data = {c.name: getattr(device, c.name) for c in Device.__table__.columns}
    data["health"] = services.health_of(device.status, device.battery, device.signal_strength)
    return data


def list_devices(db: Session) -> list[dict]:
    rows = db.scalars(select(Device).order_by(Device.id)).all()
    return [to_dict(d) for d in rows]


def get_device(db: Session, device_id: str) -> Device:
    device = db.get(Device, device_id)
    if device is None:
        raise NotFound(f"Device {device_id} not found")
    return device


def create_device(db: Session, payload: DeviceCreate) -> Device:
    taken = db.scalar(select(Device).where(Device.ip_address == payload.ip_address))
    if taken is not None:
        raise services.DomainError(f"IP address {payload.ip_address} is already assigned to {taken.id}")
    existing = db.scalars(select(Device.id)).all()
    # also consider ids that only survive in the audit log, so deleted ids are never reused
    existing += db.scalars(select(StatusLog.device_id).distinct()).all()
    device = Device(id=services.next_device_id(existing), **payload.model_dump())
    db.add(device)
    db.add(StatusLog(device_id=device.id, old_status=None, new_status=device.status,
                     event="REGISTERED", reason_note="Device registered"))
    db.commit()
    db.refresh(device)
    return device


def update_status(db: Session, device_id: str, status: str, reason_note: str) -> Device:
    device = get_device(db, device_id)
    services.validate_status_change(device.status, status, reason_note)
    db.add(StatusLog(device_id=device.id, old_status=device.status, new_status=status,
                     event="STATUS_CHANGE", reason_note=reason_note.strip()))
    device.status = status
    if status == "Offline":
        device.uptime_seconds = 0
    db.commit()
    db.refresh(device)
    return device


def reboot(db: Session, device_id: str) -> Device:
    device = get_device(db, device_id)
    services.validate_reboot(device.status)
    db.add(StatusLog(device_id=device.id, old_status=device.status, new_status="Online",
                     event="REBOOT", reason_note="Remote reboot issued"))
    device.status = "Online"
    device.uptime_seconds = 0
    device.last_seen = utcnow()
    db.commit()
    db.refresh(device)
    return device


def record_telemetry(db: Session, device_id: str, payload: TelemetryUpdate) -> Device:
    device = get_device(db, device_id)
    device.battery = payload.battery
    device.signal_strength = payload.signal_strength
    if payload.uptime_seconds is not None:
        device.uptime_seconds = payload.uptime_seconds
    device.last_seen = utcnow()
    db.commit()
    db.refresh(device)
    return device


def history(db: Session, device_id: str) -> list[StatusLog]:
    get_device(db, device_id)
    return list(db.scalars(
        select(StatusLog).where(StatusLog.device_id == device_id).order_by(StatusLog.id.desc())
    ))


def delete_device(db: Session, device_id: str) -> None:
    device = get_device(db, device_id)
    db.delete(device)
    # keep a tombstone so the id is not handed out again
    db.add(StatusLog(device_id=device_id, old_status=device.status, new_status="Deleted",
                     event="DELETED", reason_note="Removed from fleet registry"))
    db.commit()


DEMO_FLEET = [
    dict(name="Rover-Alpha", type="Rover", ip_address="192.168.1.10", status="Online",
         battery=85, signal_strength=92, uptime_seconds=273_600, firmware="2.4.1", location="Depot A"),
    dict(name="Drone-Beta", type="Drone", ip_address="192.168.1.12", status="Offline",
         battery=42, signal_strength=0, uptime_seconds=0, firmware="1.9.0", location="Field 3"),
    dict(name="Sensor-Gamma", type="Sensor", ip_address="192.168.1.21", status="Online",
         battery=16, signal_strength=74, uptime_seconds=1_209_600, firmware="3.0.2", location="North Ridge"),
    dict(name="Edge-Delta", type="Edge Node", ip_address="192.168.1.30", status="Maintenance",
         battery=100, signal_strength=88, uptime_seconds=3_600, firmware="1.2.0", location="Server Room"),
    dict(name="Rover-Epsilon", type="Rover", ip_address="192.168.1.11", status="Online",
         battery=64, signal_strength=23, uptime_seconds=86_400, firmware="2.4.1", location="Depot B"),
    dict(name="Truck-Zeta", type="Vehicle", ip_address="192.168.1.40", status="Online",
         battery=93, signal_strength=81, uptime_seconds=432_000, firmware="5.1.0", location="Route 7"),
]


def seed(db: Session) -> None:
    if db.scalar(select(Device.id).limit(1)) is not None:
        return
    now = utcnow()
    for i, data in enumerate(DEMO_FLEET, start=1):
        registered = now - timedelta(days=30 - i * 3)
        device = Device(id=f"DEV-{i:03d}", created_at=registered, **data)
        db.add(device)
        db.add(StatusLog(device_id=device.id, old_status=None,
                         new_status="Online" if data["status"] != "Offline" else "Offline",
                         event="REGISTERED", reason_note="Seeded demo device", changed_at=registered))
    db.flush()
    db.add(StatusLog(device_id="DEV-004", old_status="Online", new_status="Maintenance",
                     event="STATUS_CHANGE", reason_note="Scheduled firmware upgrade",
                     changed_at=now - timedelta(hours=2)))
    db.commit()
