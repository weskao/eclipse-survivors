import { BALANCE } from '../../config'

/** Immutable, deterministic boss encounter design. No shared combat/engine changes. */
export type BossId = 'abyss-monarch' | 'frost-sovereign' | 'infernal-titan' | 'eclipse-seraph'
export type BossShape = 'circle' | 'ring' | 'beam' | 'arena'
export type BossAttackKind = 'burst' | 'zone' | 'projectile' | 'summon'
export type BossCueId = `bosses:${string}`

export interface BossAttack {
  readonly kind: BossAttackKind
  readonly shape: BossShape
  readonly windup: number
  readonly recover: number
  /** World-space collision measurements; rendering and damage use the same geometry. */
  readonly radius: number
  readonly innerRadius?: number
  readonly width?: number
  readonly length?: number
  readonly count?: number
  readonly speed?: number
  readonly duration?: number
  readonly damage: number
}

export const BOSS_ATTACKS: Readonly<Record<keyof typeof BALANCE.bosses.attacks, BossAttack>> = BALANCE.bosses.attacks as unknown as Record<keyof typeof BALANCE.bosses.attacks, BossAttack>

export type BossAttackId = keyof typeof BOSS_ATTACKS

export interface BossDefinition {
  readonly id: BossId
  readonly title: string
  readonly color: string
  readonly health: number
  readonly phaseNames: readonly [string, string, string]
  readonly phases: readonly [readonly BossAttackId[], readonly BossAttackId[], readonly BossAttackId[]]
  readonly introCue: BossCueId
  readonly transitionCue: BossCueId
  readonly attackCue: BossCueId
  readonly deathCue: BossCueId
}

export const BOSS_DEFINITIONS: Record<BossId, BossDefinition> = {
  'abyss-monarch': {
    id: 'abyss-monarch', title: 'Abyss Monarch', color: '#a58aff', health: BALANCE.bosses.health['abyss-monarch'],
    phaseNames: ['Veil of Dusk', 'Summoned Court', 'Abyssal Collapse'],
    phases: [['shadow-fan', 'darkness-field'], ['shadow-cross', 'abyss-summon', 'darkness-field'],
      ['abyss-collapse', 'shadow-storm', 'abyss-summon']],
    introCue: 'bosses:abyss-intro', transitionCue: 'bosses:abyss-transition',
    attackCue: 'bosses:abyss-strike', deathCue: 'bosses:abyss-defeat',
  },
  'frost-sovereign': {
    id: 'frost-sovereign', title: 'Frost Sovereign', color: '#9cddff', health: BALANCE.bosses.health['frost-sovereign'],
    phaseNames: ['Winter Barrage', 'Frozen Bastion', 'Absolute Zero'],
    phases: [['ice-fan', 'frost-patch'], ['glacial-ring', 'rotating-shelter', 'ice-fan'],
      ['rotating-shelter', 'winter-burst', 'ice-storm']],
    introCue: 'bosses:frost-intro', transitionCue: 'bosses:frost-transition',
    attackCue: 'bosses:frost-strike', deathCue: 'bosses:frost-defeat',
  },
  'infernal-titan': {
    id: 'infernal-titan', title: 'Infernal Titan', color: '#ff9958', health: BALANCE.bosses.health['infernal-titan'],
    phaseNames: ['The Great Hammer', 'Molten Earth', 'Titan Enraged'],
    phases: [['titan-slam', 'ember-line'], ['eruption', 'flame-wave', 'titan-slam'],
      ['titan-rage', 'flame-wave', 'eruption']],
    introCue: 'bosses:infernal-intro', transitionCue: 'bosses:infernal-transition',
    attackCue: 'bosses:infernal-strike', deathCue: 'bosses:infernal-defeat',
  },
  'eclipse-seraph': {
    id: 'eclipse-seraph', title: 'Eclipse Seraph', color: '#ffe8a8', health: BALANCE.bosses.health['eclipse-seraph'],
    phaseNames: ['Light Ascendant', 'Dark Reversal', 'Total Eclipse'],
    phases: [['radiant-lance', 'light-ring'], ['void-fan', 'shadow-sweep', 'twilight-ground'],
      ['eclipse-wedge', 'eclipse-cross', 'seraph-finale']],
    introCue: 'bosses:seraph-intro', transitionCue: 'bosses:seraph-transition',
    attackCue: 'bosses:seraph-strike', deathCue: 'bosses:seraph-defeat',
  },
}
