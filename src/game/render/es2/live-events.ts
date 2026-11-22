import type { ContentVisualFx } from '../../types'
import { COMBAT_FX_BY_KIND, type CombatFxKind } from './combat-vfx'
import { emitCombatVfx } from '../../content/packs/combat-vfx'

/**
 * Engine-owned observations, not predictions from renderer state.
 * The producer guarantees the event actually happened and assigns a strictly
 * increasing sequence per run. A directional cue must snapshot its true angle.
 */
export type DirectionalCombatFxKind =
  | 'sword-slash' | 'projectile-trail' | 'lightning-chain' | 'dash-afterimage'

type CombatFxPoint = Readonly<{ sequence: number; x: number; y: number }>
export type ConfirmedCombatVfxEvent = CombatFxPoint & (
  | Readonly<{ kind: DirectionalCombatFxKind; angle: number }>
  | Readonly<{ kind: Exclude<CombatFxKind, DirectionalCombatFxKind>; angle?: number }>
)

export interface LiveCombatVfxAdapter {
  /** O(1) deduplication: accepts strictly increasing, run-scoped sequence IDs. */
  emit(event: ConfirmedCombatVfxEvent): boolean
  /** The integration owner calls this on an authoritative new-run/reset. */
  reset(): void
  /** Stop emissions and release the effect sink when the engine is disposed. */
  dispose(): void
  readonly lastSequence: number
}

const DIRECTIONAL_KINDS: ReadonlySet<CombatFxKind> = new Set([
  'sword-slash', 'projectile-trail', 'lightning-chain', 'dash-afterimage',
])

/**
 * Connect after the engine has confirmed a gameplay outcome; callers translate
 * their actual combat/chest/boss/evolution event to an authored FX kind.
 *
 * No timers, retained entity identities or extra effect arrays. The registry
 * enforces the 96-instance budget and <=4s lifetime. Rejected *valid* events
 * still consume their sequence so replay cannot emit late duplicates.
 */
export function createLiveCombatVfxAdapter(
  addEffect: (effect: ContentVisualFx) => boolean,
): LiveCombatVfxAdapter {
  let lastSequence = -1
  let sink: typeof addEffect | undefined = addEffect
  return {
    get lastSequence() { return lastSequence },
    emit(event) {
      if (!sink || !event || !Number.isSafeInteger(event.sequence)
        || event.sequence < 0 || event.sequence <= lastSequence
        || !COMBAT_FX_BY_KIND.has(event.kind)
        || !Number.isFinite(event.x) || !Number.isFinite(event.y)
        || (event.angle !== undefined && !Number.isFinite(event.angle))
        || (DIRECTIONAL_KINDS.has(event.kind) && !Number.isFinite(event.angle))) return false

      lastSequence = event.sequence
      return emitCombatVfx(sink, event.kind, event.x, event.y, { angle: event.angle })
    },
    reset() {
      if (sink) lastSequence = -1
    },
    dispose() {
      sink = undefined
    },
  }
}
