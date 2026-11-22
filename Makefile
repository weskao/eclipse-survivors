# Eclipse Survivors shortcuts. Run from the repository root.
.DEFAULT_GOAL := dev

PNPM ?= pnpm
PORT ?= 5173

.PHONY: setup dev build preview test typecheck check-release verify help

# Install the exact locked dependencies on first use or after a manifest/lockfile change.
node_modules: package.json pnpm-lock.yaml
	$(PNPM) install --frozen-lockfile
	@touch node_modules

setup: node_modules ## Install dependencies from pnpm-lock.yaml

dev: node_modules ## Start the game at localhost (auto-opens your browser); PORT=5174 to override
	$(PNPM) dev --host localhost --port $(PORT) --open

build: node_modules ## Build the production site into dist/
	$(PNPM) build

preview: build ## Build and preview the production site locally
	$(PNPM) preview --host localhost --port 4173 --open

test: node_modules ## Run Vitest unit tests
	$(PNPM) test

typecheck: node_modules ## Run TypeScript checks
	$(PNPM) typecheck

check-release: node_modules ## Validate the release artifact
	$(PNPM) check-release

verify: node_modules ## Run unit tests, type checks, build, and release checks
	$(PNPM) test
	$(PNPM) typecheck
	$(PNPM) build
	$(PNPM) check-release

help: ## List available commands
	@awk -F':.*## ' '/^[a-z-]+:.*## /{printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
