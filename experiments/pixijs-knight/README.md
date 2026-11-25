# Knight PixiJS hybrid candidate (QA_PENDING)

This is no longer only an isolated POC. The actual game's DEV combat actor draw now has an opt-in Knight GPU candidate. See [the seven-phase acceptance roadmap](../../docs/knight-pixijs-roadmap.md) for implementation status, missing native directional layers, and browser/performance gates. Keep the existing production Canvas path until those gates pass.

## Launch the real game

    make dev-pixi
    # or make dev-pixi-unlocked
    # phone on trusted LAN: make phone-pixi / make phone-pixi-unlocked

The new DEV Make targets install both locked dependency sets on first use and enable the imported QA_PENDING directional art. Open the LAN address printed by Vite for phone playtesting; these phone targets do not invoke the optional branch-switching skill. Select Knight. Query overrides: ?knightPixi=0 for Canvas, ?knightRigCandidates=0 for the single-view GPU fallback. Inspect the actual main canvas data-knight-renderer attribute: loading, pixi, or canvas (fallback). Compare with ?knightPixi=0. The older isolated preview remains at /experiments/pixijs-knight/ but is not the gameplay acceptance surface.

PixiJS 8.23.0 is pinned; package-lock.json was produced by the actual successful GitHub Actions npm install (run 45542992775) and its Git blob was verified byte-for-byte. No remote module imports, no commercial Spine dependency.

## Verification

    make test-pixi
    pnpm test
    pnpm typecheck
    pnpm build
    pnpm check-release

Dedicated CI workflow knight-pixi-hybrid.yml runs the full project suite and preserves its required visual-approval gate. The base branch currently has pending visual review for Shadowblade, Spirit Summoner and Crimson Paladin; do not approve those to pass this Knight-only branch. Independent typecheck/build/browser evidence should still run even when that base art gate fails. The first CI run installed PixiJS and passed 1,567 Vitest tests with one pre-existing art gate failure and one skipped test. Actual browser/physical device/art acceptance is still pending.

The real game candidate reuses the original 340x345 Knight WebP, arm IK, fixed-length hip/knee/foot chains, independent rigid sword texture with mesh-sampled grip, eight movement octants plus stationary center, independent attack aim and continuous mesh deformation. It does not yet provide eight independently authored directional views, repaired occluded limbs, or true native 3x layer art. No release promotion.

The eight directional body/weapon candidate pairs are now present. They remain QA_PENDING (occluded limbs and grip repair still require art work); they are not a full separated-limb rig. Production stays unchanged.
