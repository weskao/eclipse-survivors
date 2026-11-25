import type { ContentEffectDefinition, ContentPack } from '../contracts'
import type { ContentVisualFx, GameState, Mob } from '../../types'
import {
  COMBAT_FX_BY_KIND, COMBAT_FX_SPECS, drawCombatEffect,
  type CombatFxKind, type CombatVfxPreferences, type DirectedCombatFx,
} from '../../render/es2/combat-vfx'

/**
 * Emit explicitly from a gameplay-confirmed event; never synthesize a crit,
 * boss phase or projectile hit from a visual-only guess. The Foundation
 * registry enforces the 96-effect queue and four-second lifetime limits.
 */
export function emitCombatVfx(
  addEffect: (effect: ContentVisualFx) => boolean,
  kind: CombatFxKind,
  x: number, y: number,
  options: { angle?: number; life?: number } = {},
): boolean {
  const spec = COMBAT_FX_BY_KIND.get(kind)
  if (!spec || !Number.isFinite(x) || !Number.isFinite(y)
    || (options.angle !== undefined && !Number.isFinite(options.angle))) return false
  const life = options.life ?? spec.duration
  if (!Number.isFinite(life) || life <= 0 || life > spec.duration) return false
  const effect: DirectedCombatFx = {
    id: spec.id, x, y, life, max: spec.duration,
    ...(options.angle === undefined ? {} : { angle: options.angle }),
  }
  return addEffect(effect)
}

/** The pack is per-engine configurable. Callback settings can update live. */
export function createCombatVfxPack(settings: CombatVfxPreferences = {}): ContentPack {
  const motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
  const preferences: CombatVfxPreferences = {
    ...settings,
    reducedMotion: settings.reducedMotion ?? (() => motionQuery?.matches ?? false),
  }
  // Weak keys and weak mob identities prevent a long-running game from retaining
  // old states or dead monsters. New runs must send an authoritative reset/start.
  const seen = new WeakMap<GameState, { killed: WeakSet<Mob>; won: boolean }>()
  return {
    id: 'combat-vfx',
    effects: COMBAT_FX_SPECS.map((spec): ContentEffectDefinition => ({
      id: spec.id, title: spec.title,
      draw(ctx, state, effect, ox, oy) {
        drawCombatEffect(ctx, state, effect, ox, oy, spec.kind, preferences)
      },
    })),
    onEvent({ state, addEffect }, event) {
      if (event.type === 'start' || event.type === 'reset') {
        seen.delete(state)
        return
      }
      if (event.type === 'critical-hit') {
        // The authoritative hit path already emitted one contact texture; retain event for other packs.
        if (!event.contactOwned) emitCombatVfx(addEffect, 'critical-hit', event.x, event.y, { angle: event.angle })
        return
      }
      if (event.type !== 'kill' && event.type !== 'run-complete') return
      let run = seen.get(state)
      if (!run) {
        run = { killed: new WeakSet<Mob>(), won: false }
        seen.set(state, run)
      }
      if (event.type === 'kill') {
        if (run.killed.has(event.mob)) return
        run.killed.add(event.mob)
        emitCombatVfx(addEffect, 'enemy-death', event.mob.x, event.mob.y)
      } else if (event.type === 'run-complete' && event.win && !run.won && state.hero) {
        run.won = true
        emitCombatVfx(addEffect, 'victory-finish', state.hero.x, state.hero.y - 25)
      }
    },
  }
}

/** Not installed into packs/index.ts on a parallel branch. */
export const COMBAT_VFX_PACK: ContentPack = createCombatVfxPack()
