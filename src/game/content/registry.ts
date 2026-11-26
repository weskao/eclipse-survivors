import { random } from '../math'
import type { Ctx2D } from '../render/ctx'
import type { AbilityId, ContentEvent, ContentId, ContentVisualFx, EvolutionId, GameHooks, GameState, UpgradeId } from '../types'
import type { ContentAbility, ContentContext, ContentEffectDefinition, ContentPack } from './contracts'

export const MAX_CONTENT_EFFECTS = 96
export const MAX_CONTENT_EFFECT_SECONDS = 4
const PACK_ID = /^[a-z][a-z0-9-]{0,31}$/
const LOCAL_ID = /^[a-z][a-z0-9-]{0,63}$/

/** Also used at the save-data boundary; missing optional packs must not erase their IDs. */
export function isContentId(id: unknown): id is ContentId {
  if (typeof id !== 'string' || id.length > 98) return false
  const parts = id.split(':')
  return parts.length === 2 && PACK_ID.test(parts[0]!) && LOCAL_ID.test(parts[1]!)
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
  /** `skip` is an effect another renderer (the hero Pixi pass) already owns this frame. */
  render(ctx: Ctx2D, state: GameState, ox: number, oy: number, skip?: ContentVisualFx): void
}

/** Construct once per engine. No registration or mutable registry lookup tables in a frame. */
export function createContentRegistry(packs: readonly ContentPack[] = [], rng: () => number = random): ContentRegistry {
  const ids = new Set<string>()
  const abilityMap = new Map<ContentId, ContentAbility>()
  const effectMap = new Map<ContentId, ContentEffectDefinition>()
  const sorted = [...packs].sort((a, b) => a.id.localeCompare(b.id))
  const packIds = new Set<string>()
  const registered: ContentPack[] = []
  for (const pack of sorted) {
    if (!PACK_ID.test(pack.id) || packIds.has(pack.id)) throw new Error('Invalid or duplicate content pack: ' + pack.id)
    packIds.add(pack.id)
    const copy = { ...pack }
    for (const kind of ['abilities', 'enemies', 'stages', 'worldEvents', 'effects'] as const) {
      const entries = pack[kind] ?? []
      const owned = entries.map(entry => {
        if (!isContentId(entry.id) || !entry.id.startsWith(pack.id + ':') || ids.has(entry.id)) {
          throw new Error('Invalid or duplicate content ID: ' + entry.id)
        }
        ids.add(entry.id)
        const cloned = { ...entry }
        if ('requires' in cloned && Array.isArray(cloned.requires)) {
          Object.assign(cloned, { requires: Object.freeze(cloned.requires.map(r => Object.freeze({ ...r }))) })
        }
        if (kind === 'abilities') {
          const a = cloned as ContentAbility
          if (!Number.isInteger(a.maxLevel) || a.maxLevel < 1 || !['common','rare','legendary'].includes(a.rarity)
            || !['ability','weapon','evolution'].includes(a.kind) || !Number.isFinite(a.cooldownSeconds ?? 0)
            || (a.cooldownSeconds ?? 0) < 0 || (a.kind === 'evolution' && (a.maxLevel !== 1 || a.rarity !== 'legendary'))) {
            throw new Error('Invalid content ability: ' + a.id)
          }
          if (a.kind === 'evolution') Object.assign(cloned, { isEvolution: true })
          abilityMap.set(a.id, a)
        }
        if (kind === 'effects') effectMap.set(cloned.id, cloned as ContentEffectDefinition)
        return Object.freeze(cloned)
      })
      Object.assign(copy, { [kind]: Object.freeze(owned) })
    }
    registered.push(Object.freeze(copy))
  }
  const stablePacks = Object.freeze(registered)
  const abilities = Object.freeze(stablePacks.flatMap(p => p.abilities ?? []))
  const context = (state: GameState, hooks: GameHooks): ContentContext => ({
    state, hooks, random: rng, addEffect: effect => addEffect(state, effect),
  })
  function addEffect(state: GameState, effect: ContentVisualFx): boolean {
    if (!effectMap.has(effect.id) || state.content.effects.length >= MAX_CONTENT_EFFECTS
      || ![effect.x, effect.y, effect.life, effect.max].every(Number.isFinite)
      || effect.max <= 0 || effect.max > MAX_CONTENT_EFFECT_SECONDS
      || effect.life <= 0 || effect.life > effect.max) return false
    state.content.effects.push({ ...effect })
    return true
  }
  const levelOf = (state: GameState, id: AbilityId): number => {
    if (isContentId(id)) return state.content.levels[id] ?? 0
    return state.hero?.skills[id as UpgradeId] ??
      (state.hero?.evolutions[id as EvolutionId] ? 1 : 0)
  }
  function eligible(state: GameState): ContentAbility[] {
    if (!state.hero) return []
    return abilities.filter(a =>
      (state.content.levels[a.id] ?? 0) < a.maxLevel &&
      (a.requires?.every(req => levelOf(state, req.id) >= req.level) ?? true) &&
      (a.eligible?.(state) ?? true))
  }
  return Object.freeze({
    packs: stablePacks, abilities,
    getAbility: (id: AbilityId) => isContentId(id) ? abilityMap.get(id) : undefined,
    eligible,
    acquire(state: GameState, id: ContentId, hooks: GameHooks): boolean {
      const ability = abilityMap.get(id)
      if (!ability || !eligible(state).includes(ability)) return false
      const level = (state.content.levels[id] ?? 0) + 1
      state.content.levels[id] = level
      state.content.cooldowns[id] = 0
      ability.onAcquire?.(context(state, hooks), level)
      return true
    },
    tick(state: GameState, dt: number, hooks: GameHooks): void {
      if (!Number.isFinite(dt) || dt <= 0) return
      if (!abilities.length && !state.content.effects.length) return
      if (state.content.effects.length) {
        for (const effect of state.content.effects) effect.life -= dt
        state.content.effects = state.content.effects.filter(effect => effect.life > 0)
      }
      if (!state.hero) return
      for (const ability of abilities) {
        const level = state.content.levels[ability.id] ?? 0
        if (!level || !ability.onTick) continue
        const timer = (state.content.cooldowns[ability.id] ?? 0) - dt
        state.content.cooldowns[ability.id] = Math.max(0, timer)
        if (timer > 0) continue
        const cooldown = ability.cooldownSeconds ?? 0
        if (cooldown) state.content.cooldowns[ability.id] = cooldown
        ability.onTick(context(state, hooks), dt, level)
      }
    },
    emit(state: GameState, event: ContentEvent, hooks: GameHooks): void {
      for (const pack of stablePacks) pack.onEvent?.(context(state, hooks), event)
    },
    addEffect,
    render(ctx: Ctx2D, state: GameState, ox: number, oy: number, skip?: ContentVisualFx): void {
      for (const effect of state.content.effects) {
        if (effect === skip) continue
        const definition = effectMap.get(effect.id)
        if (!definition) continue
        ctx.save()
        try { definition.draw(ctx, state, effect, ox, oy) } finally { ctx.restore() }
      }
    },
  })
}
