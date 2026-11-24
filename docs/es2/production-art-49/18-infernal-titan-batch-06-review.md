# Infernal Titan Batch 06 — DEV phase transition review

Source commit: 3a1ccea1152be6e7de646fde512a854e8c407361. The new WebP and manifest are present; 1374×1145, 719988 bytes, manifest alpha128 bounds [65,39,1333,1114], manifest SHA-256 c332252cfefbf05312ac27ef8191a3eaab69c296d20bdb6d60b9acf50bff17da.

Mode 3 (`?showcase=1&es2BossArtQa=infernal-titan&es2BossMotionQa=3`) now selects the new awakening candidate only during the target phase 2 transform. Existing phase 3 overload candidate stays provisional; phase 1 transform falls back to canonical static art. Shared scale, provisional alpha128 bottom-center anchor (699,1114), reduced-motion and decode fallbacks remain. No change to controller or combat. Batch 05 stride candidates remain unsequenced because margins and character identity are not approved. No manifest approval flags changed.

Independent Node tests against an exact Git-blob-matched copy of the selector/draw module: RED 2 failing, GREEN 2 passing. Added equivalent project Vitest coverage. Full CI and real gameplay visual review are separate acceptance gates and have not been confirmed.

Remaining: canonical phase 3 transformation, visually coherent alternating locomotion, recovery and other boss motion assets; desktop/mobile actual Canvas capture and human approval. Candidate art must not ship in release. 
