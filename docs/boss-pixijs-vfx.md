# PixiJS Boss VFX pipeline (phase 1)

- Pinned stable PixiJS 8.23.0, using the dependency lock from the existing knight experiment without merging that experiment.
- Lazy WebGL initialization on the first nonempty boss VFX pass; existing rAF owns simulation and rendering. No second ticker, DOM overlay, input listeners or new actor images.
- GPU sprites render boss projectiles and releases (all 25 profiles), with a reusable mask per slot and a bounded pool of additive particles. Cached textures use existing decoded image sources. Warnings, active hazard materials, other combat effects and UI remain Canvas-owned in this phase. The functional warning is always drawn, including when VFX is off. GPU release and projectile passes have exclusive ownership; load/init/loss/paint failure returns to Canvas.
- Composite the offscreen GPU canvas immediately at each original z-order boundary (at most two full-viewport composites per nonempty boss frame). This preserves HUD/damage text, capture compatibility and camera transforms. It may cause a browser synchronization cost; profile before expanding to every effect or claiming better GPU draw calls/power.
- DPR mirrors the existing game; same safe geometry, lifecycle, opacity, Reduced Motion and Reduced Flashing. No physics or audio changes. GPU textures/pools are disposed on unmount. A lost context permanently falls back for that mount.
- Tests: pure geometry, budgets and fallback contract. Required real-device QA: all attacks and actual pixel masks; context loss, pause, resize, 130 enemy scenario, mobile browser, FPS p95/p99, memory and thermal comparison. Do not approve before those pass.

The boss-video QA now requests headless Chromium software WebGL and requires every distinct attack to have actual successfully composited Pixi release evidence. This is functional GPU-path validation, not a hardware performance measurement. The capture JSON includes per-renderer pass counters and unique attack IDs.
