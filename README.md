# Fleet Management System (FleetOps)

## 1. Vision Document
### Project Overview
FleetOps is a containerized full-stack application designed to monitor, track, and manage IoT device fleets in real time. It provides telemetry visualization and status controls for fleet operators.

### Problem It Solves
Managing distributed hardware fleets (drones, rovers, field sensors) without centralized telemetry leads to operational downtime, untracked device failures, and high maintenance overhead. FleetOps centralizes status tracking and deployment operations into a unified dashboard.

### Target Users (Personas)
* **Fleet Operators:** Monitor operational status, view online/offline metrics, and trigger emergency stops.
* **Maintenance Engineers:** Inspect device health, run diagnostics, and log repair tasks.
* **System Administrators:** Provision new devices, manage access permissions, and manage container deployments.

### Vision Statement
To provide a lightweight, cloud-native, and developer-friendly fleet orchestration platform that seamlessly scales from local Docker edge environments to enterprise deployments.

### Key Features / Goals
* **Real-time Fleet Monitoring:** View state across all connected devices.
* **CRUD Operations:** Dynamically register, update status, and decommission devices.
* **Containerized Architecture:** Fully dockerized frontend and backend services orchestrated via Docker Compose.
* **FastAPI Backend:** High-performance REST API with asynchronous handling.

### Success Metrics
* Sub-100ms API response time for telemetry retrieval.
* Zero downtime hot-reloading during local container development.
* 100% test coverage on critical REST endpoints.

### Assumptions & Constraints
* **Assumptions:** Network connectivity is available between devices and the backend service.
* **Constraints:** Must run smoothly on local development environments using Docker and Docker Compose.

---

## 2. Quick Start – Local Development

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
* [Git](https://git-scm.com/) installed.

### Running with Docker Compose
1. **Clone the repository:**
   ```bash
   git clone <https://github.com/nachosftw/edgeops-fleet-manager>
   cd <edgeops-fleet-manager>
   ## MoSCoW Prioritization
* **Must Have (Essential for MVP):**
  * View Device List (US 01)
  * Add New Device (US 02)
  * Delete Device (US 03)
  * Containerized Stack & Docker Compose (US 06, US 07, US 08)
* **Should Have (High Priority):**
  * Filter Devices by Status (US 04)
  * Device Detail View (US 05)
  * Enable Hot-Reloading (US 09)
* **Could Have (Nice to Have):**
  * Search Fleet (US 16)
  * Device Geolocation Map (US 20)
  * Battery Telemetry Monitoring (US 22)
* **Won't Have (Deferred for Future Releases):**
  * Firmware Update Trigger (US 23)
  * User Authentication (US 17)
  ## Architecture Diagram
![System Architecture](./rev1.drawio.png)