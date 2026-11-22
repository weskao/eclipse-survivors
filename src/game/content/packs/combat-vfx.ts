import type { ContentPack } from '../contracts'
import type { ContentVisualFx } from '../../types'
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
  return {
    id: 'combat-vfx',
    effects: COMBAT_FX_SPECS.map(spec => ({
      id: spec.id, title: spec.title,
      draw(ctx, state, effect, ox, oy) {
        drawCombatEffect(ctx, state, effect, ox, oy, spec.kind, preferences)
      },
    })),
    onEvent({ state, addEffect }, event) {
      // These events have authoritative positions and outcomes. All other VFX
      // require integration-owned gameplay hooks with their actual direction.
      if (event.type === 'kill') {
        emitCombatVfx(addEffect, 'enemy-death', event.mob.x, event.mob.y)
      } else if (event.type === 'run-complete' && event.win && state.hero) {
        emitCombatVfx(addEffect, 'victory-finish', state.hero.x, state.hero.y - 25)
      }
    },
  }
}

/** This is intentionally NOT installed into packs/index.ts on a parallel branch. */
export const COMBAT_VFX_PACK: ContentPack = createCombatVfxPack()
