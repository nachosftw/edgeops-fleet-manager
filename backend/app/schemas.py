"""Pydantic request/response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import services

Status = Literal["Online", "Offline", "Maintenance"]
DeviceType = Literal["Rover", "Drone", "Sensor", "Edge Node", "Vehicle"]


class DeviceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    type: DeviceType
    ip_address: str
    status: Status = "Online"
    location: str = Field(default="Unassigned", max_length=64)
    firmware: str = Field(default="1.0.0", max_length=16)

    @field_validator("name", "location")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @field_validator("ip_address")
    @classmethod
    def check_ip(cls, value: str) -> str:
        value = value.strip()
        if not services.is_valid_ipv4(value):
            raise ValueError("must be a valid IPv4 address, e.g. 192.168.1.10")
        return value


class StatusUpdate(BaseModel):
    status: Status
    reason_note: str = Field(default="", max_length=500)


class TelemetryUpdate(BaseModel):
    battery: int = Field(ge=0, le=100)
    signal_strength: int = Field(ge=0, le=100)
    uptime_seconds: int | None = Field(default=None, ge=0)


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: str
    ip_address: str
    status: str
    battery: int
    signal_strength: int
    uptime_seconds: int
    firmware: str
    location: str
    created_at: datetime
    last_seen: datetime
    health: str = "Healthy"


class StatusLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    old_status: str | None
    new_status: str
    event: str
    reason_note: str
    changed_at: datetime


class Alert(BaseModel):
    device_id: str
    device_name: str
    severity: Literal["critical", "warning"]
    message: str


class FleetSummary(BaseModel):
    total: int
    online: int
    offline: int
    maintenance: int
    average_battery: float
    availability_pct: float
    alerts: list[Alert]
