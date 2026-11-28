# Release Process and Repository About

This project is a Vue 3 + TypeScript + Vite application built with pnpm as a multi-file static site in `dist/`. Its release process follows the core principle used by [Skyline Rush](https://github.com/weskao/skyline-rush): **verify first, deploy second, and finally confirm that the public URL loads the game**. GitHub Actions uploads the build output to GitHub Pages.

## GitHub repository information

- **Repository**: <https://github.com/weskao/eclipse-survivors>
- **Current visibility**: Public
- **Default branch**: `main`
- **Website URL**: <https://weskao.github.io/eclipse-survivors/>
- **Game entry point**: `index.html` (Vite entry point) → `src/main.ts`; build output is `dist/`

### Suggested GitHub About content

Use the following information in **About → Edit (gear icon)** on the right side of the repository homepage. **This document does not automatically update the GitHub About fields.**

**Description**

> A fantasy survival-action browser game with auto combat, evolving skills, dynamic weather, boss encounters, original music, and desktop/mobile controls.

**Website**

`https://weskao.github.io/eclipse-survivors/`

**Topics**

`survivor-game`, `browser-game`, `html5-game`, `javascript`, `canvas`, `fantasy-game`, `action-game`, `roguelite`, `offline-game`, `mobile-friendly`

## GitHub Pages settings

The project currently uses **B. GitHub Actions** as its only deployment path. Option A no longer applies; do not enable both, or the deployments may queue behind or cancel each other.

### A. Deploy from a branch (not applicable)

- **Source**: Deploy from a branch
- This option no longer works: the root `index.html` is only a Vite entry point. The application must be built with `pnpm build` to produce `dist/` before it can run, so it cannot be published directly.

**Note**: Branch deployment may update the public site immediately after a push without waiting for custom verification jobs. To ensure that publication happens only after tests pass, use GitHub Actions as the Pages source.

### B. GitHub Actions (current, with verification gate)

- **Source**: GitHub Actions
- The [release workflow](../.github/workflows/release.yml) has a deploy job and a dependent Release job. Both jobs check out the event commit.
- A push to `main` or a manual dispatch runs the deploy job. It runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm check-release` in order. It checks the built entry point, manifest, icons and screenshots, then uploads and deploys `dist/`. The public URL check requires the game title and a fetchable, non-empty hashed JavaScript bundle referenced by the page.
- After a successful deployment from a `main` push, the Release job creates the `vX.Y.Z` tag and GitHub Release for the verified commit. It skips an existing Release, stops if `main` has moved before creating a new Release, and stops for manual inspection if the tag exists without a Release. Manual dispatch only redeploys. A `v*` tag does not trigger deployment.
- The upload-to-deploy handoff waits until the Pages artifact is visible to GitHub Actions. Avoid rerunning an old failed Pages workflow attempt: reruns can create duplicate `github-pages` artifacts. Use a fresh `main` run instead.
- To redeploy manually: select **Actions → Verify and publish Eclipse Survivors → Run workflow**, and choose the `main` branch.

## ES4 branch build configuration

The tracked root `.env` sets `VITE_ES4_HALL=1` on the ES4 feature branch. Vite loads it for `pnpm build`, `make build`, `make verify`, `make deploy-netlify` and GitHub Actions builds of that checkout. Do not duplicate the flag in workflow environment settings. A production build shows the read-only ES4 preview; unlocked gameplay remains DEV-only. The existing `make deploy` / `make deploy-pages` targets dispatch remote `main`, not the local feature checkout, and use main's own configuration. No Pages deployment is redirected automatically. Review the default before merging to develop.

## Development-only QA surfaces

- `pnpm dev` / `make dev` keep C104 reference boards, enemy/boss/biome and UI art inspection galleries, content showcase and explicitly enabled candidate previews available for review.
- `pnpm build` / `make build` exclude QA-only UI components, styles, original PNG/WebP contact sheets, and isolated review-only assets from `dist/`. Real compendium, achievements, canonical gameplay art, music and platform icons remain.
- QA galleries are tested against Vite DEV, not production preview. `pnpm check-release` rejects both copied and hashed review-only assets and QA UI code/styles before deployment. Never use query strings or CSS hiding as a substitute for excluding development modules from the release artifact.

## Versioned release

**Version progression (mandatory):** Each new published release advances exactly one patch step from the latest published GitHub Release. Use `MAJOR.MINOR.PATCH`, with PATCH limited to 0–99. When PATCH is 99, increment MINOR by one and reset PATCH to 0. Do not skip versions, roll back, or automatically increment MAJOR. For example: `1.2.3 → 1.2.4 → … → 1.2.98 → 1.2.99 → 1.3.0 → 1.3.1`. Existing historical releases are not rewritten. The same version may be redeployed without creating a duplicate Release.

The release workflow verifies this rule against the latest published GitHub Release before building or deploying a main push. If the previous Release cannot be retrieved, the check fails rather than guessing. To check locally, run `node scripts/check-release-version.mjs v1.2.99 1.3.0`. The boundary and rejection cases run as part of `pnpm test`.

1. Confirm that the game features being announced are actually implemented in `src/`.
2. Update `CHANGELOG.md` to describe only features players can currently experience, in both Traditional Chinese and English.
   - Set the `version` in `package.json` to the upcoming release version (for example, `1.2.1` after `1.2.0`), following the mandatory progression above. Vite's `define` (`__APP_VERSION__`) displays this value in the version bar on the character selection screen.
   - The `version` in `package.json` must match the latest `## [x.y.z]` entry in `CHANGELOG.md`. A Vitest test enforces this, and `pnpm check-release` checks the built output in `dist/`.
   - Before committing, run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm check-release` locally in that order, and ensure they all pass.
3. After the full checks pass, commit the version and changelog updates to `main` when authorized. A regular push to `main` starts the deployment workflow.
4. For a new version, confirm that both jobs in **Verify and publish Eclipse Survivors** succeeded and that the Release job created the expected tag.
5. Confirm the new GitHub Release and tag point to the deployed commit. A skipped existing Release still belongs to the commit originally tagged for that version. See [GitHub Releases](https://github.com/weskao/eclipse-survivors/releases).
6. On desktop and mobile, confirm starting an adventure, movement, the upgrade menu, sound effects, and pause work correctly.

## Troubleshooting

- The public URL returns 404: check that the Pages source is GitHub Actions, the latest deployment succeeded, and that workflow uploaded `dist/`.
- An Actions workflow fails: inspect the actual error logs in [Actions](https://github.com/weskao/eclipse-survivors/actions); do not claim the site is live.
- No background music: browsers usually require user interaction first. Click anywhere on the character selection screen to start the music, then select “Start Adventure” to switch to the battle music. Confirm that both the background music and sound effects toggles are set as expected.
- Important visual principle: design concept images must not be presented as real screenshots of the finished game.
