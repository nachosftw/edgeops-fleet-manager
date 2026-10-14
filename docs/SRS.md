# Software Requirements Specification: FleetOps v1.0

Prepared by Nakshathra P (24BAI1442). Format adapted from IEEE 830 / ISO/IEC/IEEE 29148.

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of **FleetOps**, a containerised web platform for monitoring and managing fleets of IoT field devices. It is written for the development team, the course evaluators and future maintainers.

### 1.2 Scope
FleetOps lets operators see the live state of every registered device (rovers, drones, sensors, edge nodes, vehicles), register and decommission devices, change operational status with an auditable reason, issue remote reboots and receive telemetry. Release 1.0 runs as two Docker containers (React SPA served by nginx, FastAPI backend) with an SQLite store. User authentication, GPS maps, OTA firmware updates and WebSocket streaming are out of scope for 1.0 (see §6).

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Device | A registered hardware asset identified by `DEV-NNN` |
| Status | One of `Online`, `Offline`, `Maintenance` |
| Health | Derived classification: `Healthy`, `Warning`, `Critical` |
| Telemetry | Battery %, signal strength %, uptime reported by a device |
| Audit log / Status log | Append-only record of registrations, status changes, reboots and deletions |
| SPA | Single-page application |

### 1.4 References
Vision document & MoSCoW list (README, Review 1) · Software Design Document (Review 2) · GitHub Issues #1–#25 (user stories).

## 2. Overall Description

### 2.1 Product perspective
FleetOps is a new, self-contained system. It follows a three-tier client–server architecture: browser SPA → REST API → relational store, deployed with Docker Compose.

### 2.2 Product functions (summary)
1. Fleet dashboard with totals, availability, average battery, telemetry chart and alerts
2. Device registry: list, search, filter, register, view details, delete
3. Status management with reason notes and an audit trail
4. Remote reboot and telemetry ingestion
5. Client-side settings: API endpoint, refresh rate, light/dark theme

### 2.3 User classes
| User class | Description | Main functions |
|---|---|---|
| Fleet Operator | Watches fleet state all day | Dashboard, list/search/filter, status change |
| Maintenance Technician | Diagnoses individual units | Device details, gauges, history, reboot, Maintenance status |
| System Administrator | Provisions hardware and runs the stack | Register / delete devices, settings, deployment |
| IoT Device (external system) | Pushes readings | Telemetry endpoint |

### 2.4 Operating environment
Any host with Docker Engine 24+ and Docker Compose v2 (Windows, macOS, Linux, GitHub Codespaces). Client: a current Chrome, Edge, Firefox or Safari. Backend: Python 3.12. Frontend build: Node.js 22.

### 2.5 Design and implementation constraints
* REST/JSON over HTTP. All routes versioned under `/api/v1`.
* Backend in Python/FastAPI with Pydantic validation; frontend in React.
* Must start with a single `docker compose up --build`.
* Data must persist across container restarts (named volume).

### 2.6 Assumptions and dependencies
* Network connectivity exists between devices, browsers and the backend.
* Devices have unique IPv4 addresses on the fleet network.
* A single backend instance (SQLite) is sufficient for the target fleet size (≤ 1,000 devices).

## 3. Functional Requirements

Priority uses MoSCoW (M = Must, S = Should, C = Could). "US" is the GitHub issue number.

| ID | Requirement | Priority | US |
|---|---|---|---|
| FR-01 | The system shall list all registered devices with ID, name, type, IP, status, battery and health. | M | #1 |
| FR-02 | The system shall register a device from name (2–64 chars), type, IPv4 address, optional location and initial status, and assign the next `DEV-NNN` id. | M | #2 |
| FR-03 | The system shall reject a registration whose IP address is already assigned (HTTP 409) or whose fields are invalid (HTTP 422). | M | #2 |
| FR-04 | The system shall delete a device on request, after a UI confirmation, and return 404 for unknown ids. Ids shall never be reused. | M | #3 |
| FR-05 | The system shall filter the device list by status and by type, and search by name, ID or IP. | S | #4, #16 |
| FR-06 | The system shall show a device detail view with metadata (ID, IP, type, firmware, location, uptime, last seen), battery and signal gauges, and the status history. | S | #5 |
| FR-07 | The system shall change a device's status to Online, Offline or Maintenance. A reason note is mandatory for Maintenance. Re-sending the current status is rejected (409). | M | #21 |
| FR-08 | Every registration, status change, reboot and deletion shall be written to an append-only audit log, including the old status, new status, reason and timestamp. | S | #21 |
| FR-09 | The system shall issue a remote reboot to a device that is not Offline, setting it Online with uptime 0. Rebooting an Offline device is rejected (409). | S | #5 |
| FR-10 | The system shall accept telemetry readings (battery 0–100, signal 0–100, optional uptime) and update `last_seen`. | C | #14, #22 |
| FR-11 | The system shall classify device health: Critical if Offline or battery ≤ 10%; Warning if battery < 20%, signal < 30% or Maintenance; otherwise Healthy. | C | #22 |
| FR-12 | The dashboard shall show totals per status, availability %, average battery, a battery/signal chart and a list of active alerts (offline, low battery, weak signal), critical first. | M | #19, #22 |
| FR-13 | The dashboard and lists shall refresh automatically at a configurable interval (5 s, 10 s, 30 s, off). | S | #14 |
| FR-14 | The settings page shall let the user set the API base URL, test the connection, choose the refresh rate and toggle light/dark theme. Settings persist in the browser. | C | — |
| FR-15 | The backend shall expose `/api/v1/health` and interactive OpenAPI docs at `/docs`. | S | #11, #25 |

## 4. Non-Functional Requirements

| ID | Category | Requirement | Verification |
|---|---|---|---|
| NFR-01 | Performance | p95 API response time < 100 ms for list/detail/summary with the demo fleet on a developer machine. | Benchmark (measured p95 ≤ 6.8 ms) |
| NFR-02 | Reliability | Data survives container and application restarts. | Integration test `test_data_survives_restart` + Docker volume |
| NFR-03 | Maintainability | Backend statement coverage ≥ 90% and a mutation score ≥ 90% on domain rules. | pytest-cov (99%), mutmut (100%) |
| NFR-04 | Portability | The whole stack starts with one `docker compose up --build`. | CI `docker` job |
| NFR-05 | Usability | Every destructive action needs confirmation, validation errors are shown inline next to the field, and success or failure is announced with a toast. | E2E-02, E2E-06 |
| NFR-06 | Security | All input is validated on the server (types, ranges, IPv4 format, enum values). CORS origins are configurable. No secrets in the repository. | Unit + integration tests |
| NFR-07 | Compatibility | The UI works at ≥ 360 px wide and on current evergreen browsers. | Responsive CSS, Playwright Chromium |
| NFR-08 | Observability | Health-check endpoint, and Docker `HEALTHCHECK` on both containers. | `GET /api/v1/health` |

## 5. External Interface Requirements

### 5.1 User interfaces
Six screens, matching the Figma wireframes from Review 1: Dashboard, Device List, Device Details, Add Device (modal), Status Update (modal) and Settings. Navy (#0B1F3A) and cyan (#06B6D4) brand palette, with a dark theme.

### 5.2 Software interfaces (REST API)
| Method | Route | Success | Errors |
|---|---|---|---|
| GET | `/api/v1/health` | 200 | — |
| GET | `/api/v1/fleet/summary` | 200 | — |
| GET | `/api/v1/devices?status=&type=&search=` | 200 | 422 |
| POST | `/api/v1/devices` | 201 | 409, 422 |
| GET | `/api/v1/devices/{id}` | 200 | 404 |
| PUT | `/api/v1/devices/{id}/status` | 200 | 404, 409, 422 |
| POST | `/api/v1/devices/{id}/reboot` | 200 | 404, 409 |
| POST | `/api/v1/devices/{id}/telemetry` | 200 | 404, 422 |
| GET | `/api/v1/devices/{id}/history` | 200 | 404 |
| DELETE | `/api/v1/devices/{id}` | 204 | 404 |

### 5.3 Data interfaces
SQLite database `fleetops.db` with two tables, `devices` and `status_logs` (see the ERD). The connection string can be overridden with `DATABASE_URL`, so the system can move to PostgreSQL without code changes.

## 6. Deferred Requirements (Won't have in 1.0)
User authentication (#17), role-based access (#18), API rate limiting (#24), bulk CSV upload (#13), PDF export (#15), geolocation map (#20), OTA firmware trigger (#23), WebSocket streaming (#14; replaced by polling).
