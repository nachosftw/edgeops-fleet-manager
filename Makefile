# FleetOps build automation.  `make help` lists targets.
PY ?= python3
VERSION := $(shell cat VERSION)

.PHONY: help install lint test test-unit test-integration test-regression coverage mutation \
        frontend-test e2e build docker-build up down release clean

help:
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-18s %s\n", $$1, $$2}'

install: ## Install backend + frontend dependencies
	cd backend && $(PY) -m pip install -r requirements-dev.txt
	cd frontend && npm install

lint: ## Static checks (ruff)
	cd backend && $(PY) -m ruff check app tests

test-unit: ## Backend unit tests
	cd backend && $(PY) -m pytest -m unit -v

test-integration: ## Backend API + DB integration tests
	cd backend && $(PY) -m pytest -m integration -v

test-regression: ## Regression suite (pinned defects)
	cd backend && $(PY) -m pytest -m regression -v

test: ## All backend tests + frontend unit tests
	cd backend && $(PY) -m pytest
	cd frontend && npm test

coverage: ## Backend tests with branch coverage report
	cd backend && $(PY) -m pytest --cov --cov-report=term-missing --cov-report=html

mutation: ## Mutation testing of the domain rules (mutmut)
	cd backend && mutmut run; mutmut results

e2e: ## Browser end-to-end tests (Playwright, starts its own servers)
	cd frontend && PYTHON=$(PY) npx playwright test

build: ## Production frontend bundle
	cd frontend && npm run build

docker-build: ## Build both container images
	docker compose build

up: ## Run the full stack on http://localhost:3000
	docker compose up -d --build

down: ## Stop the stack
	docker compose down

release: test build ## Tag the current commit with VERSION
	git tag -a v$(VERSION) -m "FleetOps v$(VERSION)"

clean:
	rm -rf frontend/dist backend/.pytest_cache backend/htmlcov backend/.coverage backend/.mutmut-cache
