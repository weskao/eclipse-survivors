# Eclipse Survivors — Content Pack Contract v1

This contract is the shared interface for every parallel feature branch. **The foundation commit SHA is immutable**: after the foundation branch passes all checks, use its exact final SHA to create EVERY feature branch. Do not branch from current main or from another feature branch.

## Source of truth and ownership
- Source contract: src/game/content/contracts.ts
- Runtime/validation: src/game/content/registry.ts
- Per-run state: GameState.content in src/game/types.ts and src/game/state.ts
- **Integration-owned manifest:** src/game/content/packs/index.ts — feature branches MUST NOT edit.
- Feature-owned pack modules: src/game/content/packs/<feature-name>.ts, each exporting one named ContentPack constant.
- No changes to legacy combat/upgrade/scene/profile files in parallel branches without an explicitly coordinated interface change.
- No new dependencies; use existing Vue 3, TypeScript, Vite, Canvas 2D and Vitest.
- Legacy UP, EVOLUTIONS, legacy boss/victory and Profile version 2 MUST remain unchanged.

## Exact public TypeScript API

~~~ts
export interface ContentRequirement {
  readonly id: AbilityId
  readonly level: number
}
export interface ContentAbility extends Omit<UpgradeDef, 'id'> {
  readonly id: ContentId
  readonly kind: 'ability' | 'weapon' | 'evolution'
  readonly requires?: readonly ContentRequirement[]
  readonly cooldownSeconds?: number
  // iconSrc?: string is inherited from UpgradeDef (use an imported local asset URL).
  eligible?(state: GameState): boolean
  onAcquire?(context: ContentContext, level: number): void
  onTick?(context: ContentContext, dt: number, level: number): void
}
export interface ContentEntry {
  readonly id: ContentId
  readonly title: string
}
export interface ContentEffectDefinition extends ContentEntry {
  draw(ctx: Ctx2D, state: GameState, effect: ContentVisualFx, ox: number, oy: number): void
}
export interface ContentPack {
  readonly id: string
  readonly abilities?: readonly ContentAbility[]
  readonly enemies?: readonly ContentEntry[]
  readonly stages?: readonly ContentEntry[]
  readonly worldEvents?: readonly ContentEntry[]
  readonly effects?: readonly ContentEffectDefinition[]
  onEvent?(context: ContentContext, event: ContentEvent): void
}
export interface ContentContext {
  readonly state: GameState
  readonly hooks: GameHooks
  readonly random: () => number
  addEffect(effect: ContentVisualFx): boolean
}
export interface ContentRegistry {
  readonly packs: readonly ContentPack[]
  readonly abilities: readonly ContentAbility[]
  getAbility(id: AbilityId): ContentAbility | undefined
  eligible(state: GameState): ContentAbility[]
  acquire(state: GameState, id: ContentId, hooks: GameHooks): boolean
  tick(state: GameState, dt: number, hooks: GameHooks): void
  emit(state: GameState, event: ContentEvent, hooks: GameHooks): void
  addEffect(state: GameState, effect: ContentVisualFx): boolean
  render(ctx: Ctx2D, state: GameState, ox: number, oy: number): void
}
export function createContentRegistry(packs?: readonly ContentPack[], rng?: () => number): ContentRegistry
export function isContentId(value: unknown): value is ContentId
~~~ 

ContentId is the compile-time template-literal type for namespace:slug. Runtime validation requires lowercase namespace matching /^[a-z][a-z0-9-]{0,31}$/, and slug matching /^[a-z][a-z0-9-]{0,63}$/. Examples: arcane:chain-bolt, beasts:storm-wolf. IDs MUST be globally unique across abilities, enemies, stages, worldEvents and effects. The namespace must equal the pack id. Pack ids themselves must be unique.

## Content lifetime and events

ContentEvent is this exact discriminated union:

~~~ts
type ContentEvent =
  | { type: 'hit' | 'kill'; mob: Mob; damage: number }
  | { type: 'damage'; amount: number }
  | { type: 'pickup'; kind: 'xp' | 'world'; amount?: number }
  | { type: 'start' | 'reset' }
  | { type: 'scene-change'; index: number }
  | { type: 'run-complete'; win: boolean }

interface ContentRuntime {
  levels: Partial<Record<ContentId, number>>
  cooldowns: Partial<Record<ContentId, number>>
  effects: ContentVisualFx[]
}
interface ContentVisualFx { id: ContentId; x: number; y: number; life: number; max: number }
~~~ 

All handlers are synchronous. The engine invokes pack callbacks in alphabetical pack-id order, independent of registration input order. Within a pack, ability and effect order follows the submitted array. Effects draw in emission order. Never use Math.random inside a pack; use context.random, or inject seeded(seed) into the registry for tests.

Each ability owns its own cooldown under GameState.content.cooldowns[ability.id]. A positive cooldownSeconds invokes onTick when ready and sets that timer after firing. Zero or omitted cooldownSeconds invokes onTick each simulation tick. On acquisition, the ability's level advances and cooldown starts at zero. New runs discard all content levels, cooldowns and effects. Old built-in skills continue to use their original Hero fields.

ContentContext.addEffect only accepts effects with previously registered IDs, finite coordinates/lifetimes, 0 < life <= max <= 4 seconds, and a maximum of 96 simultaneously live instances. Drawing is protected with Canvas context save/restore. Never push custom visuals into unbounded arrays or maintain indefinite timers.

## Minimal independently-testable feature example

~~~ts
import type { ContentPack } from '../contracts'

export const ARCANE_PACK: ContentPack = {
  id: 'arcane',
  abilities: [{
    id: 'arcane:chain-bolt',
    kind: 'weapon',
    icon: '✦',
    title: 'Chain Bolt',
    desc: 'A periodic magical strike',
    rarity: 'rare',
    maxLevel: 5,
    cooldownSeconds: 2,
    requires: [{ id: 'bolt', level: 2 }],
    onTick({ state, random, addEffect }, dt, level) {
      // Use deterministic targets and the existing combat helpers.
      // random is seeded in tests; dt and level are provided by the engine.
      void state; void random; void addEffect; void dt; void level
    },
  }],
}
~~~ 

~~~ts
import { createContentRegistry } from '../registry'
import { seeded } from '../../math'
import { ARCANE_PACK } from './arcane-pack'
import { createState, createHero } from '../../state'

// Import the feature pack directly; do NOT edit packs/index.ts in feature branches.
const registry = createContentRegistry([ARCANE_PACK], seeded(42))
const state = createState()
state.hero = createHero('knight')
registry.eligible(state)
~~~ 

For a custom evolution, use kind: 'evolution', rarity: 'legendary', maxLevel: 1 and requirements for original or registered abilities. Registration automatically marks it as an evolution for the original level-up UI. A pack may provide an optional iconSrc imported from a local Vite asset. Without iconSrc, the HUD and upgrade picker show the icon glyph without attempting to fetch a nonexistent built-in SVG. Rarity is the existing common/rare/legendary union; candidates participate in the existing weighted selection, and owned/capped abilities are excluded. A pack can register metadata for enemies/stages/world events, but doing so alone does NOT spawn enemies, modify AI, or install a new stage; a separate feature module must implement and test the actual behavior, and integration must explicitly wire it.

## Persistence and default compatibility
Profile storage keeps SAVE_KEY eclipse-survivors.profile.v2 and version 2; valid namespaced discovered abilities persist across reloads even when the defining pack is not installed. Invalid, unnamespaced IDs remain rejected. No player save migration, new global registry or forced content unlock occurs from merely adding a pack. With CONTENT_PACKS empty, all old gameplay remains active.

## Development showcase
Run pnpm dev and open the game with ?content-showcase=1. A small dev-only content panel lists installed packs and their abilities, permits eligible acquisitions during gameplay, and emits sample world-pickup/scene events. It is never enabled in production builds. Programmatic tests use createEngine({ audio: testAudio, contentPacks: [FEATURE_PACK] }) or createContentRegistry([FEATURE_PACK], seeded(42)) directly.

## Parallel branch SOP
1. After foundation CI is green, copy the exact foundation SHA from the final delivery message. NEVER use a moving latest-main or latest-foundation branch ref.
2. For EVERY independent feature branch, create from the SAME SHA: git fetch origin && git switch -c feature/es-<feature> <FOUNDATION_SHA>.
3. Implement the feature module only in src/game/content/packs/<feature>.ts and its own tests/assets; import its pack directly in isolated tests.
4. Write failing Vitest tests, implement RED → GREEN → REFACTOR, and run pnpm test, pnpm typecheck, pnpm build, pnpm check-release. Respect the performance rules and deterministic ordering.
5. Commit and push ONLY that branch. Do not modify src/game/content/packs/index.ts; do not merge other feature branches or create a PR unless instructed.
6. The final integration branch, also based on the SAME foundation commit, alone imports completed feature packs into CONTENT_PACKS, resolves conflicts, and performs the full regression and release checks.

This agreement must not be changed independently by parallel feature branches. Changes to signatures, save format, lifecycle ordering or the index require a separate coordinated foundation contract revision.
