import type { ContentId, Point, SfxCue } from '../../types'

export type WorldEventId = `events:${string}`

/** Symbolic loot is intentionally opaque: relic and inventory ownership belongs to integration. */
export type WorldEventEffect =
  | { readonly type: 'xp' | 'xp-cost' | 'heal' | 'health-cost'; readonly amount: number }
  | { readonly type: 'buff'; readonly id: string; readonly seconds: number }
  | { readonly type: 'symbolic-loot'; readonly id: string; readonly tier: 'common' | 'rare' | 'epic' | 'legendary' }
  | { readonly type: 'encounter'; readonly id: string; readonly count: number }

export interface WorldEventObjectiveDef {
  readonly kind: 'stay' | 'kill'
  readonly seconds: number
  readonly count?: number
  readonly eliteOnly?: boolean
  readonly radius?: number
  readonly rewards: readonly WorldEventEffect[]
}
export interface WorldEventChoice {
  readonly id: string
  readonly title: string
  readonly risk: string
  readonly reward: string
  readonly effects: readonly WorldEventEffect[]
  readonly minHp?: number
  readonly minXp?: number
  readonly objective?: WorldEventObjectiveDef
}
export interface WorldEventDefinition {
  readonly id: WorldEventId
  readonly title: string
  readonly visualCueId: ContentId
  readonly audioCue: SfxCue
  readonly choices: readonly WorldEventChoice[]
}
export interface ActiveWorldEvent extends Point {
  readonly id: string
  readonly kind: WorldEventId
  readonly expiresAt: number
}
export interface ActiveWorldObjective {
  readonly eventId: string
  readonly choiceId: string
  readonly kind: WorldEventObjectiveDef['kind']
  readonly deadline: number
  readonly x: number
  readonly y: number
  readonly count: number
  readonly target: number
  readonly eliteOnly: boolean
}
export interface EventWorld {
  time: number
  biome: string | number
  playing: boolean
  readonly hero: { x: number; y: number; hp: number; maxHp: number; xp: number }
  canPlace(point: Point, radius: number): boolean
  canApproach(from: Point, to: Point): boolean
  isOccupied(point: Point, radius: number): boolean
}
export interface WorldEventTransaction {
  readonly id: string
  readonly eventId: string
  readonly kind: WorldEventId
  readonly choiceId: string
  readonly visualCueId: ContentId
  readonly audioCue: SfxCue
  readonly effects: readonly WorldEventEffect[]
}
export interface WorldEventDirectorOptions {
  /** Must commit all effects atomically and idempotently by transaction ID; false means no effects were applied. */
  readonly commit: (transaction: WorldEventTransaction) => boolean
  readonly random?: () => number
}
