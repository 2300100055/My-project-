# Verity Makefile

.PHONY: dev build test lint audit e2e clean

dev:
	docker compose up --build

build:
	docker compose build

test:
	cd backend && python -m pytest tests/ -v --tb=short
	cd frontend && npm test

lint:
	cd backend && ruff check . && python -m mypy app/
	cd frontend && npm run lint

audit:
	cd backend && pip-audit
	cd frontend && npm audit --audit-level=moderate

e2e:
	cd frontend && npx playwright test

clean:
	docker compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
