# Eclipse Survivors shortcuts. Run from the repository root.
.DEFAULT_GOAL := dev

PNPM ?= pnpm
PORT ?= 5173

# Like Skyline Rush, desktop dev runs against disposable Auth/Firestore emulators.
# Distinct demo projects and ports prevent accidental reuse of Skyline Rush or live data.
JAVA21_HOME := $(shell /usr/libexec/java_home -v 21+ 2>/dev/null)
WITH_EMULATORS := $(if $(JAVA21_HOME),PATH="$(JAVA21_HOME)/bin:$PATH" )VITE_ES2_FIREBASE_EMULATOR=1 $(PNPM) dlx firebase-tools@15.34.1 emulators:exec --only auth,firestore

.PHONY: setup dev dev-unlocked test-unlocked phone phone-unlocked build preview run test typecheck check-release verify deploy deploy-pages help

# Install the exact locked dependencies on first use or after a manifest/lockfile change.
node_modules: package.json pnpm-lock.yaml
	$(PNPM) install --frozen-lockfile
	@touch node_modules

setup: node_modules ## Install dependencies from pnpm-lock.yaml

dev: node_modules ## Start the game at localhost (auto-opens your browser); PORT=5174 to override
	$(WITH_EMULATORS) --project demo-eclipse-survivors '$(PNPM) dev --host 127.0.0.1 --port $(PORT) --open'

# Never use the unlocked flag for a production build. Engine guards it with import.meta.env.DEV.
dev-unlocked: node_modules ## Local playtest with unlocked progression, cosmetics and discoveries (disposable save)
	VITE_ES2_UNLOCKED=1 $(WITH_EMULATORS) --project demo-eclipse-survivors-unlocked '$(PNPM) dev --host 127.0.0.1 --port $(PORT) --open'

test-unlocked: dev-unlocked ## Alias for the unlocked local playtest

# Reuse Skyline Rush's personal phone-dev skill where installed (branch menu, off and y=1).
# Without that skill, normal phone playtesting still works over the local Wi-Fi network.
PHONE_DEV := $(HOME)/.claude/skills/phone-dev/scripts/phone_dev.py
PHONE_BRANCH := $(filter-out phone phone-unlocked,$(MAKECMDGOALS))
ifneq ($(filter phone phone-unlocked,$(MAKECMDGOALS)),)
ifneq ($(PHONE_BRANCH),)
$(eval $(PHONE_BRANCH):;@:)
endif
endif

phone: export VITE_ES2_FIREBASE_EMULATOR := 0
phone: node_modules ## Phone LAN server; with phone-dev skill: make phone [branch|off] [y=1]
	@if [ -f "$(PHONE_DEV)" ]; then \
	  python3 "$(PHONE_DEV)" $(if $(filter off,$(PHONE_BRANCH)),--off,--interactive $(if $(y),--yes) $(if $(PHONE_BRANCH),--branch "$(PHONE_BRANCH)")); \
	elif [ -n "$(PHONE_BRANCH)" ]; then \
	  echo "make phone $(PHONE_BRANCH) requires $(PHONE_DEV); plain make phone works without it."; exit 1; \
	else \
	  echo "Serving Eclipse Survivors on this computer's LAN (Ctrl+C to stop; trusted Wi-Fi only)."; \
	  $(PNPM) dev --host 0.0.0.0 --port $(PORT); \
	fi

phone-unlocked: export VITE_ES2_UNLOCKED := 1
phone-unlocked: phone ## Phone LAN playtest with disposable unlocked progression; supports [branch|off] [y=1]

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

run: verify ## Alias for the complete local verification gate

# Reuse the existing main-only Pages workflow. This does not publish the current feature branch.
# Requires an authenticated GitHub CLI (gh auth login); calling this is an explicit deploy action.
deploy: ## Dispatch the existing GitHub Pages verification/deployment workflow on remote main
	gh workflow run release.yml --ref main

deploy-pages: deploy ## Alias for make deploy

help: ## List available commands
	@awk -F':.*## ' '/^[a-z-]+:.*## /{printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
