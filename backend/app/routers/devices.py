"""/api/v1/devices endpoints."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from .. import crud, services
from ..deps import get_db
from ..schemas import DeviceCreate, DeviceOut, StatusLogOut, StatusUpdate, TelemetryUpdate

router = APIRouter(prefix="/api/v1/devices", tags=["devices"])


@router.get("", response_model=list[DeviceOut])
def list_devices(
    status_filter: Literal["Online", "Offline", "Maintenance"] | None = Query(None, alias="status"),
    search: str | None = Query(None, max_length=64),
    type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """List all registered devices, optionally filtered by status, type or a search term."""
    return services.filter_devices(crud.list_devices(db), status_filter, search, type)


@router.post("", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
def register_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    """Register a new unit into the fleet registry."""
    return crud.to_dict(crud.create_device(db, payload))


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(device_id: str, db: Session = Depends(get_db)):
    """Fetch telemetry and metadata for one device."""
    return crud.to_dict(crud.get_device(db, device_id))


@router.put("/{device_id}/status", response_model=DeviceOut)
def update_status(device_id: str, payload: StatusUpdate, db: Session = Depends(get_db)):
    """Change operational status (Online / Offline / Maintenance) with an audit note."""
    return crud.to_dict(crud.update_status(db, device_id, payload.status, payload.reason_note))


@router.post("/{device_id}/reboot", response_model=DeviceOut)
def reboot_device(device_id: str, db: Session = Depends(get_db)):
    """Issue a remote reboot. Not allowed for Offline devices."""
    return crud.to_dict(crud.reboot(db, device_id))


@router.post("/{device_id}/telemetry", response_model=DeviceOut)
def push_telemetry(device_id: str, payload: TelemetryUpdate, db: Session = Depends(get_db)):
    """Ingest a telemetry reading pushed by the device."""
    return crud.to_dict(crud.record_telemetry(db, device_id, payload))


@router.get("/{device_id}/history", response_model=list[StatusLogOut])
def device_history(device_id: str, db: Session = Depends(get_db)):
    """Audit trail of status changes for one device, newest first."""
    return crud.history(db, device_id)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(device_id: str, db: Session = Depends(get_db)):
    """Remove a device from the active fleet registry."""
    crud.delete_device(db, device_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
