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
- Workflow: `.github/workflows/release.yml`; a single job handles verification and deployment.
- A push to `main` (the only deployment trigger) runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm check-release` in order. It checks the `dist/` entry point, `manifest.webmanifest`, icons, and screenshot assets; uploads `dist/` as a Pages artifact and deploys it; then confirms the public URL returns the game entry point (HTML containing `id="app"`).
- A `v*` tag does not trigger deployment; `/release` creates version tags and GitHub Releases.
- To redeploy manually: select **Actions → Verify and publish Eclipse Survivors → Run workflow**, and choose the `main` branch.

## Versioned release

1. Confirm that the game features being announced are actually implemented in `src/`.
2. Update `CHANGELOG.md` to describe only features players can currently experience, in both Traditional Chinese and English.
   - Set the `version` in `package.json` to the upcoming release version (for example, `0.0.4`). Vite's `define` (`__APP_VERSION__`) displays this value in the version bar on the character selection screen.
   - The `version` in `package.json` must match the latest `## [x.y.z]` entry in `CHANGELOG.md`. A Vitest test enforces this, and `pnpm check-release` checks the built output in `dist/`.
   - Before committing, run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm check-release` locally in that order, and ensure they all pass.
3. Run `/release <version>` to commit the changelog, push `main` (triggering deployment), and create a tag and GitHub Release.
4. Confirm that **Verify and publish Eclipse Survivors** succeeds for that `main` push.
5. On both desktop and mobile, confirm that starting an adventure, movement, the upgrade menu, sound effects, and pause work correctly.

## Troubleshooting

- The public URL returns 404: check that the Pages source is GitHub Actions, the latest deployment succeeded, and that workflow uploaded `dist/`.
- An Actions workflow fails: inspect the actual error logs in [Actions](https://github.com/weskao/eclipse-survivors/actions); do not claim the site is live.
- No background music: browsers usually require user interaction first. Click anywhere on the character selection screen to start the music, then select “Start Adventure” to switch to the battle music. Confirm that both the background music and sound effects toggles are set as expected.
- Important visual principle: design concept images must not be presented as real screenshots of the finished game.
