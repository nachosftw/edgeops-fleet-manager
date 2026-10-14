# Test Design: FleetOps v1.0

## 1. Strategy
The suite follows the test pyramid: many fast unit tests at the bottom, API-level integration tests in the middle, and a few browser end-to-end tests at the top. Mutation testing checks the quality of the unit tests, and the regression suite pins every defect that has been fixed.

| Level | Scope | Tool | Location | Count |
|---|---|---|---|---|
| Unit | Pure domain rules in `app/services.py` | pytest | `backend/tests/unit` | 48 |
| Integration | HTTP → validation → data access → SQLite | pytest + FastAPI TestClient | `backend/tests/integration` | 23 |
| Regression | Defects found in v0.1.0, DA2 and DA3 | pytest (`-m regression`) | `backend/tests/regression` | 8 |
| Mutation | Strength of the unit and regression tests | mutmut 2.5 | `backend/setup.cfg` | 147 mutants |
| Frontend unit | Validation, formatting, filtering, routing helpers | node:test | `frontend/tests` | 8 |
| End-to-end / system | Browser → SPA → proxy → API → DB | Playwright (Chromium) | `frontend/e2e` | 7 |

**Techniques used:** equivalence partitioning (valid and invalid IPs, statuses, types), boundary-value analysis (battery 10/11, 19/20, signal 29/30), state-transition testing (the status lifecycle), error guessing (duplicate IP, id reuse, blank names), and fault injection (re-introducing the v0.1.0 id bug to prove the regression suite catches it).

**Entry criteria:** the code builds and lint (ruff) passes.
**Exit criteria:** 100% of tests pass, statement coverage ≥ 90%, mutation score ≥ 90%, and no open defect of severity High.

## 2. Unit Test Cases (selection)

| ID | Function | Input | Expected | Technique |
|---|---|---|---|---|
| UT-01 | `is_valid_ipv4` | `192.168.1.10`, `0.0.0.0`, `255.255.255.255` | True | EP (valid) |
| UT-02 | `is_valid_ipv4` | `256.1.1.1`, `1.2.3`, `01.2.3.4`, `a.b.c.d`, `""` | False | EP (invalid), BVA |
| UT-03 | `next_device_id` | `[]` | `DEV-001` | Boundary |
| UT-04 | `next_device_id` | `[DEV-001, DEV-004]` | `DEV-005` (gaps never refilled) | Error guessing |
| UT-05 | `validate_status_change` | Online → Online | DomainError 409 "Device is already Online" | State transition |
| UT-06 | `validate_status_change` | Online → Maintenance, note `"  "` | DomainError 422 | State transition |
| UT-07 | `validate_reboot` | Offline | DomainError 409 | State transition |
| UT-08 | `health_of` | battery 10 / 11 / 19 / 20, signal 29 / 30 | Critical / Warning / Warning / Healthy | BVA |
| UT-09 | `build_alerts` | warning DEV-001 + critical DEV-002 | critical listed first | Mutation-driven |
| UT-10 | `summarize` | 1 online of 3 | availability 33.3 | Mutation-driven |

## 3. Integration Test Cases

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| IT-01 | Register then fetch | POST valid device → GET by id → GET list | 201, id DEV-001, health Healthy, appears in list |
| IT-02 | Invalid payloads | POST with bad IP / short name / blank name / bad type / bad status | 422 each, nothing stored |
| IT-03 | Duplicate IP | POST the same IP twice | 409 "already assigned to DEV-001" |
| IT-04 | Unknown device | GET / DELETE / history / reboot DEV-404 | 404 "Device DEV-404 not found" |
| IT-05 | Status flow with audit | PUT Maintenance + note → GET history | 200, history = [STATUS_CHANGE, REGISTERED] |
| IT-06 | Status rules over HTTP | PUT the same status; PUT Maintenance with no note | 409; 422; status unchanged |
| IT-07 | Reboot | Reboot a Maintenance device; reboot an Offline device | 200 Online, uptime 0, REBOOT logged; 409 |
| IT-08 | Telemetry | POST battery 8 / signal 60; POST battery 101 | health Critical; 422 |
| IT-09 | Delete | DELETE → GET → re-register the same IP | 204 with empty body; 404; 201 |
| IT-10 | Filters | `?status=Offline`, `?type=Rover`, `?search=gamma`, `?status=Broken` | Correct subsets; 422 |
| IT-11 | Summary tracks changes | Change a status and delete a device, then GET summary | Counts update |
| IT-12 | Persistence | Write with app A, restart as app B on the same DB file | Data and history present |
| IT-13 | CORS & OpenAPI | Origin header; GET `/openapi.json` | ACAO header; all 8 routes documented |

## 4. Regression Suite

| ID | Defect (origin) | Guard |
|---|---|---|
| RG01 | Ids reused after delete: `len(devices)+1` (v0.1.0) | Add 3, delete DEV-002, add → DEV-004, no duplicate ids |
| RG02 | Highest id reused after delete (found in DA3) | Add, delete DEV-001, add → DEV-002 |
| RG03 | Status endpoint accepted any string (DA2) | `banana` → 422 |
| RG04 | Delete of an unknown id returned success (v0.1.0) | → 404 |
| RG05 | Blank names accepted (v0.1.0) | `"    "` → 422 |
| RG06 | Refactor could break `uvicorn main:app` | `import main` works |
| RG07 | Response contract drift breaks the UI | Exact field set |
| RG08 | Same-status update duplicated audit entries | 409, history length 1 |

**Fault-injection check:** with the v0.1.0 id logic put back into `crud.create_device`, RG01 and RG02 fail and the other 6 pass. This shows the suite detects the original bug.

## 5. Mutation Testing
`mutmut run` mutates `app/services.py` (operators, constants, strings, comparisons) and runs the unit and regression tests against each mutant.

| Run | Mutants | Killed | Survived | Score |
|---|---|---|---|---|
| #1 | 147 | 141 | 6 | 95.9% |
| #2 (after adding 6 targeted test cases) | 147 | 147 | 0 | 100% |

The 6 survivors from run #1 exposed weak assertions. Four were error messages checked with `in` instead of `==`. One was alert ordering, which the old test only covered by coincidence of id order. One was rounding precision in `availability_pct`.

## 6. End-to-End Test Cases (Playwright)

| ID | User journey | Key assertions |
|---|---|---|
| E2E-01 | Open dashboard | 6 total, 4 online, Drone-Beta alert, "API connected" |
| E2E-02 | Register device | Client IPv4 error → server 409 duplicate → success toast "registered as DEV-007" |
| E2E-03 | Search & filter | 7 rows → 3 for "rover" → "No devices match" with Offline |
| E2E-04 | Status change | Reason required for Maintenance; history shows "Online → Maintenance" + note |
| E2E-05 | Reboot | Disabled for Offline DEV-002; works for DEV-001 and is logged |
| E2E-06 | Delete | Confirm modal → row removed |
| E2E-07 | Settings | Test connection "API v1.0.0"; dark theme persists after reload |

## 7. Traceability (requirements → tests)

| Requirement | Tests |
|---|---|
| FR-01 | IT-01, E2E-01, E2E-03 |
| FR-02 / FR-03 | UT-01..04, IT-01..03, RG01, RG02, RG05, E2E-02 |
| FR-04 | IT-04, IT-09, RG04, E2E-06 |
| FR-05 | IT-10, frontend `filterDevices`, E2E-03 |
| FR-06 | IT-01, E2E-04, E2E-05 |
| FR-07 / FR-08 | UT-05, UT-06, IT-05, IT-06, RG03, RG08, E2E-04 |
| FR-09 | UT-07, IT-07, E2E-05 |
| FR-10 / FR-11 | UT-08, IT-08 |
| FR-12 | UT-09, UT-10, IT-11, E2E-01 |
| FR-14 | E2E-07 |
| FR-15 | IT-13 |
| NFR-02 | IT-12 |
| NFR-03 | Coverage report, mutation runs |
