"""Application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__, crud
from .config import Settings, get_settings
from .database import Database
from .routers import devices, fleet
from .services import DomainError


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    db = Database(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        db.create_all()
        if settings.seed_demo_data:
            session = db.SessionLocal()
            try:
                crud.seed(session)
            finally:
                session.close()
        yield
        db.engine.dispose()

    app = FastAPI(
        title="FleetOps API",
        version=__version__,
        description="Fleet telemetry monitoring, asset management and remote diagnostics.",
        lifespan=lifespan,
    )
    app.state.db = db
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(crud.NotFound)
    async def not_found_handler(_: Request, exc: crud.NotFound):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(DomainError)
    async def domain_error_handler(_: Request, exc: DomainError):
        return JSONResponse(status_code=exc.code, content={"detail": exc.message})

    app.include_router(fleet.router)
    app.include_router(devices.router)
    return app


app = create_app()
