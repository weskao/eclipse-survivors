# Release and deployment process

This project's release process is a scaled-down version of Skyline Rush's gated GitHub Pages deployment: validate first, deploy only a verified build, then check the public site. No Vite, npm install, or third-party CDN is required.

## One-time GitHub Pages setup

1. Keep the repository **Private** if you want the source code private. GitHub Pages from a private repository requires an eligible GitHub plan (for a personal account, GitHub Pro or above).
2. Open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Once Pages is enabled, the workflow in `.github/workflows/release.yml` deploys verified `main` commits to <https://weskao.github.io/survivor-game/>.
4. GitHub Pages is publicly accessible even when the source repository is private. Do not embed API keys, credentials, or sensitive data in the game.

## Continuous delivery

- Pull request to `main`: run the offline static-game gate, but do not publish.
- Push to `main`: run the gate; then publish `index.html` as the Pages artifact; then fetch the public URL and verify title plus Start button markup.
- Push a `v*` tag: verify that the commit is reachable from `main`; validate; publish; verify public URL; create a GitHub Release with automatically generated notes.
- Manual **Actions → Verify and publish Survivor Game → Run workflow** on `main`: verify and redeploy without bumping a version.

## Versioned releases

1. Verify the planned features actually exist in `index.html`. Concept art is not a shipped game feature.
2. Update `CHANGELOG.md` with player-facing Traditional Chinese and English release notes.
3. Push changes to `main` and confirm its **Verify and publish Survivor Game** run is green.
4. Create an annotated version tag on the verified commit and push it, e.g. `git tag -a v0.1.0 -m 'Eclipse Survivors v0.1.0' && git push origin v0.1.0`.
5. Confirm the tag run is green, the GitHub Release is created, and the public URL works on desktop and mobile. Only then announce it as released.

Do not claim that the illustration/mockup of a new visual design is implemented unless the game HTML truly renders that design.

## Troubleshooting

- `Get Pages site failed` / `Resource not accessible by integration`: configure **Settings → Pages → GitHub Actions** and check the account plan and Actions/Pages permissions.
- GitHub Pages unavailable on a private repo under GitHub Free: upgrade the GitHub plan or consciously change the repository visibility to Public. Do not make a private repository public unintentionally.
- Public URL returns 404 after a successful workflow: open **Settings → Pages**, check the published URL/source, and review the `Deploy verified game` job.
- Browser audio needs a user gesture, so the player must click **Start**; the workflow does not remove this browser restriction.
