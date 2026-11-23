---
name: es2-combat-visual-fidelity
description: Use when designing, implementing, or reviewing any Eclipse Survivors skill card, attack projectile, magic effect, enemy attack visual, damage popup or combat animation.
---

# ES2 combat visual-fidelity workflow

Apply with `CLAUDE.md`, `.claude/rules/realtime-performance.md`, and `.claude/rules/ui-responsive-layout.md`. This skill is project-native guidance and does not install a new rendering engine.

## Inventory first

- Enumerate all built-in upgrades, the 12 optional weapons, evolution recipes, enemy projectiles, and any additional content packs. Changes to shared skill cards must work for **every** ability ID, including future packs.
- Check `src/game/ui-art.ts`, `src/components/es2/menu/Es2ChoiceCards.vue`, `src/game/render/effects.ts`, `src/game/content/weapons/render.ts`, and `src/game/render/es2/production-factions.ts` before editing.
- Reuse the existing approved 3x WebP still/animated art and `src/assets/es2/production/projectiles/` transparent SVG sources. Never replace a real illustration with a text glyph.

## Art-first and animation

1. Create the authentic source art inside the owned project directory before wiring it to the game. No chat-only mockups or base64 placeholders. Keep complete transparent contours and unambiguous silhouettes; scalable SVG is suitable for glowing projectiles, while character art still follows the mandatory native 3x WebP/animation contract.
2. Load sprites only once per session and draw them in the world coordinate system. Preserve arrow/projectile heading, collision center and hitbox independently of decorative scale; don't rescale gameplay radius to fit art.
3. Keep original geometry as a fallback **only while loading or on failure**. Do not display both the original dot and the new image together.
4. Keep telegraph danger zones and boss warnings legible ABOVE cosmetic effects. Separate player hits, enemy hits, confirmed criticals, and health-loss feedback by silhouette, color and motion, not color alone.
5. A newly added skill must update the shared choice-art resolver so still/animated sources, rarity theme, upgrade level and reduced-motion fallback all work in the same card.

## Dense-combat and accessibility acceptance

- Do not add screen shake for every hit or repeatedly flash the whole screen. Favor short local impact animations; respect the player's shake preference and `prefers-reduced-motion`.
- Preserve bilingual descriptions and card readability for phone portrait/landscape, short screens, foldables, tablets, desktop, zoom and safe-area insets.
- Asset decode/cache is outside hot rendering loops. Bound and cull effect counts; profile 130-mob scenarios and check real-device median/p95/p99 frame cost before claiming an optimization.
- Reuse the existing sound cues. No new overlapping effect noise per monster.

## Test-driven gate

Write RED tests for every new sprite mapping, missing-image fallback, illustration selection, animation/still sources, enemy and player projectile distinction, reduced-motion presentation and responsive card behavior. Implement the smallest code change; verify GREEN and run `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm check-release`, relevant Chromium screenshot tests and performance diagnostics. Do not call the work production-ready from mocked Canvas tests alone.

## Renderer decision

PixiJS v8 is a viable **future** GPU renderer if browser/device profiling proves Canvas draw overhead is a bottleneck. Do **not** introduce a second renderer for a visual-only task when existing cached Canvas drawImage handles it. An actual Pixi migration requires an approved renderer boundary, measured gains on mobile, matching hitbox/telegraph behavior and isolated integration tests. Official references: https://pixijs.com/versions and https://pixijs.com/8.x/guides/components/scene-objects/particle-container. PixiJS ships dedicated agent guidance in recent v8 releases, but installing Pixi for its AI skills alone is not a sound dependency.

External agent-skill discovery reference (evaluate source/license before adopting untrusted automation): https://github.com/MengTo/Skills and https://github.com/gamedev-skills/awesome-gamedev-agent-skills.
