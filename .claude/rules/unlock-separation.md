---
paths:
  - "Makefile"
  - "src/game/engine.ts"
  - "src/game/content/meta/dev-unlocked.ts"
  - "src/cloud/cloud-runtime.ts"
  - "tests/makefile.test.ts"
---

# Test-only unlock must never ship

Mechanism (keep every link intact):

- Only `make dev-unlocked`, `make test-unlocked` and `make phone-unlocked` set `VITE_ES2_UNLOCKED=1`. `make dev`, `make build` and `make deploy` never do; `tests/makefile.test.ts` pins this.
- `src/game/engine.ts` enables the playtest only when `import.meta.env.DEV && import.meta.env.VITE_ES2_UNLOCKED === '1'`. A production build with the variable set stays locked.
- Unlocked profile and meta state come from `createUnlockedPlaytest*Storage()` in `src/game/content/meta/dev-unlocked.ts`: disposable in-memory saves, never the account-scoped storage.
- `src/cloud/cloud-runtime.ts`: with the emulator, an unlocked run uses its own demo project (`demo-eclipse-survivors-unlocked`); without it, a DEV unlocked run is `auth-only`, never `live`.

Forbidden replacements: an unlock check without `import.meta.env.DEV`, URL/query parameters, console commands, any toggle that survives `vite build`, writing unlocked embers, achievements, cosmetics or research to a real save or cloud wallet.

New unlockable content (hero, cosmetic, research, achievement, mode) must also be reachable in the unlocked playtest: extend `dev-unlocked.ts` in the same change.

After changing the unlock path, the Makefile targets or the cloud runtime: run `pnpm test`, then check a normal `make dev` still starts locked and `pnpm build && pnpm check-release` passes.

Security boundary: progress is client-side storage plus the cloud wallet; the DEV guard is a guardrail, not purchase enforcement.
