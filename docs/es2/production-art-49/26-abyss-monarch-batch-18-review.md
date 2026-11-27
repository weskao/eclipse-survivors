# Abyss Monarch Batch 18 — DEV death preview

Source commit 9c1e9c68e6c565bd61d09eea0ba08cdf3bb4b9db. The original WebP and manifest are present. The manifest specifies 1254×1254, alpha128 bounds [55,60,1210,1217] and unapproved identity, phase, timing and anchor. Alpha at low opacity touches two edges. Do not mark the candidate approved.

Explicit DEV mode 3 only: phase 3 death selects the isolated collapse/dissolve pose, with provisional alpha128 bottom-center anchor (632.5,1217). Phase 3 assignment is a review hypothesis, not an approved phase mapping. Existing death timing, reduced-motion and invalid-image fallback remain unchanged. This is one pose, not a continuous dissolve animation. The release guard excludes dissolve-key-a. No production art, combat, hero or asset approval changes.

Isolated execution of the fetched selector with TypeScript signature removed: RED one expected failure; GREEN eight cases passed. Release filename regex checked against candidate and canonical filenames. Vitest assertions added for drawing and fallback, not executed in this environment. Full CI and visual review remain pending.

Remaining art: Abyss phase transitions and movement, Frost idle/glide/death and transitions, Seraph recovery/hurt/idle/transitions and movement, Titan coherent locomotion and phase-3 continuity. Always refer to shipped phase art rather than unapproved redraws. No new images generated in this round.
