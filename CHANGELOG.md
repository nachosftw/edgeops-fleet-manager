# Changelog
All notable changes to FleetOps. Format: [Keep a Changelog](https://keepachangelog.com), versioning: [SemVer](https://semver.org).

## [1.0.0] – 2026-10-14
### Added
- `/api/v1` REST API: device CRUD, status updates with audit notes, remote reboot, telemetry ingestion, device history, fleet summary, and health check.
- SQLite persistence through SQLAlchemy, on a Docker volume.
- Domain rules: IPv4 validation, Maintenance requires a reason, Offline devices cannot be rebooted, and health classification with alerts.
- React dashboard with six screens: dashboard, device list, device details, add device, status update, and settings (dark theme included).
- Test suites: unit, integration, regression (RG01–RG08), mutation (mutmut, 147/147 killed), frontend unit, and Playwright E2E.
- Makefile, multi-stage Docker builds (nginx frontend), and GitHub Actions CI.

### Changed
- `react-scripts` replaced with an esbuild bundler. Removed the hard-coded Codespaces API URL.
- docker-compose: health checks, a named data volume, and the frontend served on port 3000 → 80.

### Fixed
- RG01/RG02: device ids were reused after a delete (`len(devices)+1`).
- RG03: the status endpoint accepted arbitrary status strings.
- RG04: deleting an unknown device returned success instead of 404.
- RG05: blank device names were accepted.

## [0.1.0] – 2026-09-04
### Added
- Prototype from Review 1: in-memory FastAPI backend, React list/add/delete UI, Dockerfiles, and docker-compose.
