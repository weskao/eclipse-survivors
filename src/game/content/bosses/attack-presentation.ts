import type { BossAttackId, BossId } from './definitions'
import profiles from './attack-presentation.json'

export type BossAttackStage = 'warning' | 'release'
export interface AttackPresentation {
  readonly boss: BossId
  readonly pitch: number
  readonly weight: number
  readonly pulses: number
  readonly shake: number
  readonly visual: string
  readonly windup: number
  readonly offset: number
}
export const ATTACK_PRESENTATION = profiles as Readonly<Record<BossAttackId, AttackPresentation>>
export const RELEASE_OFFSET = 2
export const RELEASE_DURATION = 1.25
