# Knight PixiJS hybrid — default Knight renderer

The user accepted the e547225 recorded visual reference for Knight. The actual game now defaults to that directional GPU renderer in development and production builds on this branch, with Canvas fallback. Other heroes still require their own rig profiles, directional layers and browser acceptance. Visual acceptance is not a performance or whole-release approval.

## Launch the real game

    make dev
    # or make dev-unlocked
    # phone on trusted LAN: make phone / make phone-unlocked
    # legacy -pixi commands remain compatible

The root pnpm lockfile now pins PixiJS; normal Make targets install the same dependency and enable the directional art by default. Open the LAN address printed by Vite for phone playtesting; the legacy phone-pixi target bypasses the optional branch-switching skill. Select Knight. Query overrides: ?knightPixi=0 for Canvas, ?knightRigCandidates=0 for the single-view GPU fallback. Inspect the actual main canvas data-knight-renderer attribute: loading, pixi, or canvas (fallback). Compare with ?knightPixi=0. The older isolated preview remains at /experiments/pixijs-knight/ but is not the gameplay acceptance surface.

PixiJS 8.23.0 is pinned; package-lock.json was produced by the actual successful GitHub Actions npm install (run 45542992775) and its Git blob was verified byte-for-byte. No remote module imports, no commercial Spine dependency.

## Verification

    make test-pixi
    pnpm test
    pnpm typecheck
    pnpm build
    pnpm check-release

Dedicated CI workflow knight-pixi-hybrid.yml runs the full project suite and preserves its required visual-approval gate. The base branch currently has pending visual review for Shadowblade, Spirit Summoner and Crimson Paladin; do not approve those to pass this Knight-only branch. Independent typecheck/build/browser evidence should still run even when that base art gate fails. The first CI run installed PixiJS and passed 1,567 Vitest tests with one pre-existing art gate failure and one skipped test. Actual browser/physical device/art acceptance is still pending.

The real game candidate reuses the original 340x345 Knight WebP, arm IK, fixed-length hip/knee/foot chains, independent rigid sword texture with mesh-sampled grip, eight movement octants plus stationary center, independent attack aim and continuous mesh deformation. It does not yet provide eight independently authored directional views, repaired occluded limbs, or true native 3x layer art. No automatic deployment or whole-release approval.

The eight directional body/weapon candidate pairs are now present. They remain QA_PENDING (occluded limbs and grip repair still require art work); they are not a full separated-limb rig. The reviewed Knight visuals are now selected by default on this feature branch. The five other heroes retain their existing renderers until their own rigs are ready.
