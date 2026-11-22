import type { Ctx2D } from '../render/ctx'
import type { AbilityId, ContentEvent, ContentId, ContentVisualFx, GameHooks, GameState, UpgradeDef } from '../types'

export interface ContentContext {
  readonly state: GameState
  readonly hooks: GameHooks
  /** Seedable, shared simulation RNG; never call Math.random() in a pack. */
  readonly random: () => number
  addEffect(effect: ContentVisualFx): boolean
}

export interface ContentRequirement { readonly id: AbilityId; readonly level: number }
export interface ContentAbility extends Omit<UpgradeDef, 'id'> {
  readonly id: ContentId
  readonly kind: 'ability' | 'weapon' | 'evolution'
  readonly requires?: readonly ContentRequirement[]
  /** 0/omitted: passive per-tick execution; positive: independent periodic timer. */
  readonly cooldownSeconds?: number
  eligible?(state: GameState): boolean
  onAcquire?(context: ContentContext, level: number): void
  onTick?(context: ContentContext, dt: number, level: number): void
}
export interface ContentEntry { readonly id: ContentId; readonly title: string }
export interface ContentEffectDefinition extends ContentEntry {
  draw(ctx: Ctx2D, state: GameState, effect: ContentVisualFx, ox: number, oy: number): void
}

/**
 * Data and callbacks only. Optional enemy, stage and event entries register metadata,
 * NOT automatic spawning/AI/scene transitions until their feature branch connects them.
 */
export interface ContentPack {
  readonly id: string
  readonly abilities?: readonly ContentAbility[]
  readonly enemies?: readonly ContentEntry[]
  readonly stages?: readonly ContentEntry[]
  readonly worldEvents?: readonly ContentEntry[]
  readonly effects?: readonly ContentEffectDefinition[]
  onEvent?(context: ContentContext, event: ContentEvent): void
}
