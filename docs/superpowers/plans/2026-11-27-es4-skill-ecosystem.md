# ES4 Adventurer Hall Skill Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the proposed 77-node hybrid progression ecosystem with 6 distinct hero builds, real combat effects, and a mobile-first Hall.
**Architecture:** Existing meta store is the source of truth; versioned ownership and attunement, immutable run snapshot, typed effect resolver, existing hooks, one shared Hall tree/inspector. Keep current five nodes intact.
**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Canvas/Pixi existing runtime, Chromium matrix, WebP, managed Web Audio.
**Spec:** docs/superpowers/specs/2026-11-27-es4-skill-ecosystem-design.md
**Base:** 54cad2219010381e14ab8db5f2baf87bf5a921ef
**Target:** feature/es4-adventurer-hall-skill-ecosystem
**Status:** Proposed execution roadmap; no gameplay code implemented; review design before implementation.

## Global constraints
Follow design catalog and provisional numerical values; keep v3 data intact, no cloud schema assumptions, account isolation, no live dev-unlocked wallet, no duplicate code, no new dependency, no PR/force push, only target branch. All UI en/zh-TW, touch/desktop/foldable, 3× transparent WebP, no forced scroll, no accidental spending, audio/accessibility, real effect coverage. Do not mark TODO complete without corresponding test evidence. Preserve all legacy ES3 functionality and measure baseline.

## Review focus
1. Historical v3 saves with missing new keys, corrupt/quota-failed head, stale cloud balances and account switches cannot lose currency or unlocks (Wave 1).
2. Branched AND/skip-row/cross-tree links and partial prerequisites cannot produce fake unlock sounds or enable purchases (Waves 1, 5, 6).
3. Repeated purchases, refresh, unequipped or wrong-hero loadout, changing equipped slots during combat and proc recursion cannot change active run effects (Waves 1–4).
4. Legacy vs new combat target families, boss immune targets, zero damage and hero death must not trigger duplicate attacks or accidental healing (Waves 2–4).
5. Mobile safe areas, 320px, short landscape, 200% zoom, both locales, game mute/reduced motion/flashing and rapid repeated upgrades must remain usable (Waves 5–7).

## Wave 0 — Baseline / inventory
Files: docs/es4/baseline.md (new); existing .github/workflows/es3-automated-qa.yml, es2-release-readiness-integration.yml; scripts/es2-browser-performance.mjs; scripts/es2-responsive-layout-matrix.mjs; package.json.
- [ ] Freeze reference commit and run pnpm typecheck, pnpm test, pnpm build, pnpm check-release; record exact job/test failures and baseline CI URL. Record deterministic receipt/XP/currency sample, damage/TTK and p95 in existing scenarios; list current hero, weapon, relic, status and cooldown hooks with source references.
- [ ] Identify all existing reroll counters and active source tags; if absent, specify minimal typed additions before implementing related nodes; verify classic attack/Dash and specialization Q contracts separately.
- [ ] Document save/rollback and mixed-client wallet policy. No functional work before these constraints are recorded. Commit docs.

## Wave 1 — Catalog, graph, ownership and migration
Proposed new files src/game/balance/hall-talents.json, src/game/content/meta/hall-talents.ts, hall-talents.test.ts, hall-migration.ts, hall-migration.test.ts, hall-store.test.ts. Modify state.ts, store.ts, progression.ts, dev-unlocked.ts and migration.ts in same directory as needed; retain legacy v3 decoder. Separate v4 head/two slots.
Interfaces proposed: HallTalentId string validated by catalog; HallOwnership Record<string,number>; HallAttunement { universal:string[]; hero:Partial<Record<HeroId,string>>; resonance:string|null }; HallTalentDef { id, tree, maxRank, requires, masteryGate?, cost, effect, art, layout }; validateHallCatalog(defs); hallRankCost(id,currentRank); getHallTalentStates(state,heroId); purchaseHallTalent(state,id,heroId); migrateV3ToV4(v3); setHallAttunement(state,heroId,loadout). Use existing transaction result style, immutable inputs.
- [ ] RED: catalog 72 new unique IDs, 5 legacy unchanged, DAG/cycle/invalid references/rank/hero-gate checks; all 77 reachable given full prerequisites. Test joined branch half vs full, rank cap, price exact 40→60→80→120→180 for universal root; cost boundary and nonfinite inputs.
- [ ] GREEN: implement catalog with exact spec definitions and typed effect kinds, graph checks and state projection.
- [ ] RED: migrate populated real v3 shape; preserve runs/runIds, XP, embers, original research, unlocks/cosmetics/account; no writes to v3; corrupt head/quota failure, duplicate tap/failed purchase, insufficient funds, unknown ID, wrong hero, missing prerequisite, read-only wallet conflict, account A/B isolation. Verify blocked transactions return unchanged state; test old-client compatibility gate.
- [ ] GREEN: implement v4 store with verified slot/head commit and purchase API; no migration on unsupported cloud state; preserve v2 route. Explicit dev-unlocked fixture with all talents and valid mastery but no live wallet.
- [ ] Run pnpm exec vitest run src/game/content/meta; pnpm typecheck; refactor shared validation, commit each green slice.

## Wave 2 — Universal disciplines (six independently tested slices)
Proposed new src/game/content/meta/hall-effects.ts, hall-effects.test.ts, hall-runtime.ts, hall-runtime.test.ts; modify engine.ts, combat.ts, step.ts, types.ts, progression.ts and relevant existing weapon/reward hooks. Interfaces resolveHallRunSnapshot(state,heroId), resolveHallModifiers(snapshot), createHallRuntime(snapshot, hooks, random); apply static modifiers exactly once; dispatch typed source event for timed effects; no proc-on-proc. Reuse hitTarget, modifyOutgoingDamage, mitigateIncomingDamage, afterDamage and resetRun pathways. Authoritative effects from spec.
### 戰意 · Warfare
- [ ] RED: tests each of offense-edge, offense-precision, offense-momentum, offense-execution, offense-fervor, offense-war-master at rank 0, rank 1 and cap; actual engine/target behavior matches tooltip, unowned/unequipped is identity. Check all related caps and cooldown boundaries.
- [ ] GREEN: implement these six descriptors in the shared resolver/event handlers; verify both legacy and faction targets, bosses/immunity and no recursive procs. Run targeted hall-effects/hall-runtime and existing combat/reward tests; refactor, commit.
### 鐵衛 · Bastion
- [ ] RED: tests each of defense-constitution, defense-armor, defense-recovery, defense-resolve, defense-ward, defense-last-stand at rank 0, rank 1 and cap; actual engine/target behavior matches tooltip, unowned/unequipped is identity. Check all related caps and cooldown boundaries.
- [ ] GREEN: implement these six descriptors in the shared resolver/event handlers; verify both legacy and faction targets, bosses/immunity and no recursive procs. Run targeted hall-effects/hall-runtime and existing combat/reward tests; refactor, commit.
### 秘法 · Arcana
- [ ] RED: tests each of arcana-focus, arcana-celerity, arcana-reach, arcana-frostbind, arcana-resonance, arcana-echo at rank 0, rank 1 and cap; actual engine/target behavior matches tooltip, unowned/unequipped is identity. Check all related caps and cooldown boundaries.
- [ ] GREEN: implement these six descriptors in the shared resolver/event handlers; verify both legacy and faction targets, bosses/immunity and no recursive procs. Run targeted hall-effects/hall-runtime and existing combat/reward tests; refactor, commit.
### 逐風 · Windwalk
- [ ] RED: tests each of mobility-stride, mobility-dash, mobility-evasion, mobility-afterwind, mobility-hunter, mobility-windstep at rank 0, rank 1 and cap; actual engine/target behavior matches tooltip, unowned/unequipped is identity. Check all related caps and cooldown boundaries.
- [ ] GREEN: implement these six descriptors in the shared resolver/event handlers; verify both legacy and faction targets, bosses/immunity and no recursive procs. Run targeted hall-effects/hall-runtime and existing combat/reward tests; refactor, commit.
### 尋寶 · Expedition
- [ ] RED: tests each of hunt-magnet, hunt-learning, hunt-salvage, hunt-sustain, hunt-fortune, hunt-pathfinder at rank 0, rank 1 and cap; actual engine/target behavior matches tooltip, unowned/unequipped is identity. Check all related caps and cooldown boundaries.
- [ ] GREEN: implement these six descriptors in the shared resolver/event handlers; verify both legacy and faction targets, bosses/immunity and no recursive procs. Run targeted hall-effects/hall-runtime and existing combat/reward tests; refactor, commit.
### 靈契 · Spiritcraft
- [ ] RED: tests each of summons-bond, summons-tenacity, summons-duration, summons-command, summons-soulward, summons-chorus at rank 0, rank 1 and cap; actual engine/target behavior matches tooltip, unowned/unequipped is identity. Check all related caps and cooldown boundaries.
- [ ] GREEN: implement these six descriptors in the shared resolver/event handlers; verify both legacy and faction targets, bosses/immunity and no recursive procs. Run targeted hall-effects/hall-runtime and existing combat/reward tests; refactor, commit.
- [ ] Integration RED: compare complete old save with zero new ranks vs ES3 golden snapshots; fresh and max build obey caps, reward receipt exactly-once, no invalid extra entities. Run targeted and full tests; commit.

## Wave 3 — Hero-specific trees (six slices)
Proposed new src/game/content/heroes/hall-hero-talents.ts, hall-hero-talents.test.ts; modify existing src/game/content/heroes/index.ts, engine.ts, combat.ts and actual relevant runtime hooks, not duplicate adapters. Use typed heroId and namespaced mastery; classics attack/Dash, specializations existing Q.
### 曙鋼騎士 (knight)
- [ ] RED: knight-discipline, knight-guard, knight-riposte, knight-bulwark, knight-iron-counter each exercise real battle effects, mastery gates 1/3/6, other hero unaffected, unequipped signature inert, reset no leaked timers, target caps and cost/HP rules.
- [ ] GREEN: implement the five nodes in shared handler using this hero's existing action paths; keep unique 近戰承傷、護盾、反擊；不複製聖騎士的自損屏障. Run targeted hero tests, combat tests and no-regression hero roster tests; refactor and commit.
### 夜痕遊俠 (ranger)
- [ ] RED: ranger-aim, ranger-mark, ranger-skirmish, ranger-piercing-moon, ranger-storm-hunter each exercise real battle effects, mastery gates 1/3/6, other hero unaffected, unequipped signature inert, reset no leaked timers, target caps and cost/HP rules.
- [ ] GREEN: implement the five nodes in shared handler using this hero's existing action paths; keep unique 精準遠射、移動射擊、走位；非無限投射物. Run targeted hero tests, combat tests and no-regression hero roster tests; refactor and commit.
### 虛空術士 (wizard)
- [ ] RED: wizard-study, wizard-circle, wizard-channel, wizard-star-collapse, wizard-double-sigil each exercise real battle effects, mastery gates 1/3/6, other hero unaffected, unequipped signature inert, reset no leaked timers, target caps and cost/HP rules.
- [ ] GREEN: implement the five nodes in shared handler using this hero's existing action paths; keep unique 元素、範圍與連鎖爆發；非召喚職. Run targeted hero tests, combat tests and no-regression hero roster tests; refactor and commit.
### 影刃行者 (shadowblade)
- [ ] RED: shadowblade-blade, shadowblade-vanish, shadowblade-ambush, shadowblade-phantom, shadowblade-assassin each exercise real battle effects, mastery gates 1/3/6, other hero unaffected, unequipped signature inert, reset no leaked timers, target caps and cost/HP rules.
- [ ] GREEN: implement the five nodes in shared handler using this hero's existing action paths; keep unique 暴擊、影襲、潛行後爆發；保留既有 Q 機制. Run targeted hero tests, combat tests and no-regression hero roster tests; refactor and commit.
### 靈契召喚師 (spirit-summoner)
- [ ] RED: spirit-summoner-pact, spirit-summoner-pack, spirit-summoner-mend, spirit-summoner-legion, spirit-summoner-soul-bond each exercise real battle effects, mastery gates 1/3/6, other hero unaffected, unequipped signature inert, reset no leaked timers, target caps and cost/HP rules.
- [ ] GREEN: implement the five nodes in shared handler using this hero's existing action paths; keep unique 靈體群體協作、靈潮集結與回復；保留召喚上限. Run targeted hero tests, combat tests and no-regression hero roster tests; refactor and commit.
### 緋紅聖騎 (crimson-paladin)
- [ ] RED: crimson-paladin-oath, crimson-paladin-sacrifice, crimson-paladin-vengeance, crimson-paladin-blood-sanctuary, crimson-paladin-crimson-reckoning each exercise real battle effects, mastery gates 1/3/6, other hero unaffected, unequipped signature inert, reset no leaked timers, target caps and cost/HP rules.
- [ ] GREEN: implement the five nodes in shared handler using this hero's existing action paths; keep unique 血誓代價、吸收傷害、緋紅報復；不取代騎士. Run targeted hero tests, combat tests and no-regression hero roster tests; refactor and commit.
- [ ] All six match intended playstyles in actual seeded encounters and tooltips; demonstrate at least two builds per hero.

## Wave 4 — Attunement and six cross-tree resonances
Files: hall-talents.ts, hall-runtime.ts, hall-effects.ts, hall-store.test.ts, hall-runtime.test.ts; engine.ts; new HallLoadout.vue and test.
- [ ] RED: 2 universal / 1 current hero signature / 1 resonance slots, reject unowned/wrong hero, active resonance requires both equipped, free switch in menu only, snapshot immutable through run, invalid save normalization without ownership loss, account switch resets context.
- [ ] GREEN: transactional equip operation and one run snapshot. Implement six named resonance descriptors from spec; tests confirm prerequisite ownership vs active, exact proc gates, no double triggering/extra rewards. Run focused tests, typecheck, commit.

## Wave 5 — Responsive Hall and art
Modify src/components/es2/progression/ProgressionPanel.vue, HallGrowthBoard.vue, hall-model.ts, ProgressionPanel.test.ts, src/i18n.ts; add HallTalentTabs.vue and tests only if distinct responsibility warranted; add asset manifest under existing src/assets/es2/production/ui/ and actual WebP files as needed.
- [ ] RED: all graph edges rendered including skipped layers, cross-tree portal target reachable, selected state retained by category, desktop hover/focus preview no spend, touch open no scroll, one confirmation, locked nodes inspectable, missing image/decode and duplicate IDs fail. Tab keyboard navigation and loadout slots.
- [ ] GREEN: four internal tree views (core/disciplines/hero/resonance) within research, six discipline/hero tabs, graph/list toggle, compact responsive existing inspector, true rank labels/requirements/active state, keyboard focus. One card template. Art mappings for all 72; batch missing 3× transparent WebP with manifest and original style. No temporary art treated as approved.
- [ ] Run pnpm exec vitest run src/components/es2/progression; verify 320×568, 390×844, 568×320, 844×390, tablet, foldable, desktop and 200% zoom in both languages with scripts/es2-responsive-layout-matrix.mjs; capture actual screenshots. Commit.

## Wave 6 — Audio, animation and quality
Files: src/game/audio/hall-upgrade-sample.ts, hall-research-cue.ts, their tests, audio/engine.ts, HallGrowthBoard.vue, existing managed combat VFX hooks, docs/es2/ui-audio-cue-matrix.md.
- [ ] RED: rank 1–5 waveform uniqueness at 22050/48000 Hz; actual full-prerequisite unlock adds delayed tail, partial path does not; attune different from purchase, resonance motif, rejected purchase silent celebration, mute and voice cap, rapid purchases, reduced motion/flashing.
- [ ] GREEN: extend existing cue palette with semantic modifiers and bounded cached samples; reuse metallic ring, sweep, staged crown/particles and destination pulses, dual-root convergence for resonance. No new perpetual loops. Add battle effect readability and hero-specific VFX only when triggered.
- [ ] Verify target viewport, screenshot/video and listen on desktop/mobile. Tests do not substitute for human approval. Commit.

## Wave 7 — Balance, QA and release readiness
Files: docs/es4/balance-report.md (new), existing scripts/QA, .github/workflows/es3-automated-qa.yml plus dedicated branch-triggered workflow if necessary, TODO.md. 
- [ ] Capture fixed seeds per six heroes, 3 investment levels, early/late/boss/endless scenarios, current modes, 130 enemies, correct reward and unlock time; compare no-new-node legacy baseline, p50/p95/p99, frame pacing and memory. ≤5% p95 budget with same conditions; investigate any regression. Tune config only with recorded evidence.
- [ ] Run pnpm typecheck, pnpm test, pnpm build, pnpm check-release; branch CI must cover full and responsive/audio/balance suites; confirm workflow actually triggers on new branch, no assumed green from old branch.
- [ ] Verify v2/v3/v4 storage, cloud-conflict gate, both locales, responsive matrix, manual art/audio approval, actual gameplay and no missing assets; document failures separately, never weaken tests. Mark matching TODO rows only after passing evidence. Release/merge requires separate authorization.
