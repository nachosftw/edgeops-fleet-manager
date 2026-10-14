"""ORM models: Device and StatusLog (audit trail)."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)  # e.g. DEV-001
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="Online")
    battery: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    signal_strength: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    uptime_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    firmware: Mapped[str] = mapped_column(String(16), nullable=False, default="1.0.0")
    location: Mapped[str] = mapped_column(String(64), nullable=False, default="Unassigned")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StatusLog(Base):
    __tablename__ = "status_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Logical reference to devices.id. Deliberately not a hard foreign key:
    # the audit trail is retained after a device is deleted (it also acts as
    # a tombstone so device ids are never reused).
    device_id: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    old_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    new_status: Mapped[str] = mapped_column(String(16), nullable=False)
    event: Mapped[str] = mapped_column(String(16), nullable=False, default="STATUS_CHANGE")
    reason_note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
