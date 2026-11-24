import { BALANCE } from '../../config'
import { addXp } from '../../progression'
import type { GameHooks, GameState, Point } from '../../types'
import { clearApproach, pointIsClear } from '../../world'
import { validEffects } from './definitions'
import type { EventWorld, WorldEventTransaction } from './types'

/** The integration owner calls this only with a live hero. Scene indices and future biome IDs are both valid. */
export function createLegacyEventWorld(s: GameState): EventWorld {
  if (!s.hero) throw new Error('World event adapter requires an active hero')
  return {
    time: s.time, biome: s.currentScene, playing: s.mode === 'play',
    hero: { x: s.hero.x, y: s.hero.y, hp: s.hero.hp, maxHp: s.hero.max, xp: s.hero.xp },
    canPlace: (at, radius) => pointIsClear(s.currentScene, at, radius),
    canApproach: (from, to) => clearApproach(s.currentScene, from, to, BALANCE.events.interactive.approachClearance),
    isOccupied: (at, radius) => occupied(s, at, radius),
  }
}

function occupied(s: GameState, at: Point, radius: number): boolean {
  for (const mob of s.mobs) {
    if (mob.hp <= 0) continue
    const dx = mob.x - at.x, dy = mob.y - at.y, reach = radius + mob.r
    if (dx * dx + dy * dy < reach * reach) return true
  }
  for (const event of s.events) {
    const dx = event.x - at.x, dy = event.y - at.y
    if (dx * dx + dy * dy < (radius + BALANCE.events.interactive.legacyMarkerClearance) ** 2) return true
  }
  return false
}

/**
 * Legacy-only adapter: ordinary XP/HP resolves atomically and uses familiar HUD/SFX.
 * Unsupported buffs, new encounters and symbolic loot MUST be handled by a separate
 * integration-owned atomic adapter; they are never silently discarded.
 *
 * External handlers own the ENTIRE transaction (including costs) if present.
 * A false return means they applied zero effects and the choice remains retryable.
 */
export function createLegacyEventCommit(
  s: GameState, hooks: GameHooks,
  external?: (transaction: WorldEventTransaction) => boolean,
): (transaction: WorldEventTransaction) => boolean {
  const processed = new Set<string>()
  const recent: string[] = []
  const HISTORY_LIMIT = 512

  return transaction => {
    if (processed.has(transaction.id)) return true
    if (!s.hero || s.mode !== 'play' || !validEffects(transaction.effects)) return false
    const hero = s.hero
    const requiresExternal = transaction.effects.some(effect =>
      effect.type === 'buff' || effect.type === 'symbolic-loot' || effect.type === 'encounter')
    if (requiresExternal) {
      if (!external || external(transaction) !== true) return false
    } else {
      const hpCost = transaction.effects.reduce((sum, effect) =>
        sum + (effect.type === 'health-cost' ? effect.amount : 0), 0)
      const xpCost = transaction.effects.reduce((sum, effect) =>
        sum + (effect.type === 'xp-cost' ? effect.amount : 0), 0)
      if (hero.hp <= hpCost || hero.xp < xpCost) return false
      for (const effect of transaction.effects) {
        if (effect.type === 'health-cost') hero.hp -= effect.amount
        else if (effect.type === 'xp-cost') hero.xp -= effect.amount
        else if (effect.type === 'heal') hero.hp = Math.min(hero.max, hero.hp + effect.amount)
        else if (effect.type === 'xp') addXp(s, effect.amount, hooks)
      }
    }

    // At-most-once per active window; old event IDs cannot be reintroduced by the director.
    processed.add(transaction.id)
    recent.push(transaction.id)
    if (recent.length > HISTORY_LIMIT) processed.delete(recent.shift()!)
    hooks.sfx(transaction.audioCue)
    hooks.message('✦ ' + transaction.kind.slice('events:'.length).replaceAll('-', ' ') + ' · ' + transaction.choiceId)
    hooks.content?.(s, { type: 'pickup', kind: 'world' })
    return true
  }
}

/** Guidance for engine integration; no shared files are modified by this branch. */
export const WORLD_EVENT_INTEGRATION = {
  maxActive: BALANCE.events.interactive.maxActive,
  interactionRadius: 64,
  /** Current engine world tick must call director.tick(createLegacyEventWorld(state)) only during play. */
  lifecycle: ['reset', 'scene-change', 'play-tick'] as const,
  /** UI must use director.choices/choose with stable event and choice IDs (pointer/keyboard/touch). */
  interactions: ['choices', 'choose'] as const,
  /** The integration owner must tag new encounter mobs and report their unique deaths to the director. */
  encounters: ['reportKill'] as const,
  /** Atomic external bridge must implement buff, encounter and symbolic-loot grants. */
  externalRewards: ['buff', 'encounter', 'symbolic-loot'] as const,
  /** Visual IDs are symbolic; renderer decides whether to use static textures or bounded particles. */
  feedback: ['visualCueId', 'audioCue'] as const,
} as const
