"""/api/v1/fleet and health endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import __version__, crud, services
from ..deps import get_db
from ..schemas import FleetSummary

router = APIRouter(prefix="/api/v1", tags=["fleet"])


@router.get("/health")
def health():
    """Liveness probe used by Docker and the frontend settings page."""
    return {"status": "ok", "version": __version__}


@router.get("/fleet/summary", response_model=FleetSummary)
def fleet_summary(db: Session = Depends(get_db)):
    """Dashboard numbers: totals per status, average battery, availability and alerts."""
    return services.summarize(crud.list_devices(db))
