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

export const BOSS_ATTACKS = {
  'shadow-fan': { kind: 'projectile', shape: 'beam', windup: 0.95, recover: 0.9, radius: 12, width: 12, length: 490, count: 3, speed: 215, damage: 13 },
  'darkness-field': { kind: 'zone', shape: 'circle', windup: 1.3, recover: 1.15, radius: 96, duration: 2.6, damage: 12 },
  'shadow-cross': { kind: 'projectile', shape: 'beam', windup: 1.05, recover: 1.0, radius: 12, width: 12, length: 510, count: 5, speed: 240, damage: 14 },
  'abyss-summon': { kind: 'summon', shape: 'circle', windup: 1.2, recover: 1.35, radius: 144, damage: 0 },
  'abyss-collapse': { kind: 'zone', shape: 'arena', windup: 1.8, recover: 1.35, radius: 240, duration: 2.0, damage: 17 },
  'shadow-storm': { kind: 'projectile', shape: 'beam', windup: 0.82, recover: 0.9, radius: 11, width: 11, length: 570, count: 7, speed: 270, damage: 13 },

  'ice-fan': { kind: 'projectile', shape: 'beam', windup: 1.05, recover: 0.95, radius: 12, width: 12, length: 520, count: 3, speed: 205, damage: 13 },
  'frost-patch': { kind: 'zone', shape: 'circle', windup: 1.4, recover: 1.0, radius: 102, duration: 3, damage: 10 },
  'glacial-ring': { kind: 'burst', shape: 'ring', windup: 1.3, recover: 1.2, radius: 210, innerRadius: 105, damage: 17 },
  'rotating-shelter': { kind: 'zone', shape: 'arena', windup: 1.7, recover: 1.3, radius: 245, duration: 1.8, damage: 12 },
  'winter-burst': { kind: 'burst', shape: 'circle', windup: 1.55, recover: 1.0, radius: 125, damage: 19 },
  'ice-storm': { kind: 'projectile', shape: 'beam', windup: 1.05, recover: 1.15, radius: 12, width: 12, length: 550, count: 5, speed: 235, damage: 15 },

  'titan-slam': { kind: 'burst', shape: 'circle', windup: 1.7, recover: 1.3, radius: 138, damage: 20 },
  'ember-line': { kind: 'burst', shape: 'beam', windup: 1.3, recover: 1.0, radius: 0, width: 43, length: 340, damage: 15 },
  'eruption': { kind: 'zone', shape: 'circle', windup: 1.55, recover: 1.2, radius: 120, duration: 2.4, damage: 16 },
  'flame-wave': { kind: 'burst', shape: 'ring', windup: 1.5, recover: 1.3, radius: 280, innerRadius: 155, damage: 19 },
  'titan-rage': { kind: 'burst', shape: 'circle', windup: 1.0, recover: 1.0, radius: 177, damage: 24 },

  'radiant-lance': { kind: 'burst', shape: 'beam', windup: 1.45, recover: 1.05, radius: 0, width: 30, length: 500, damage: 16 },
  'light-ring': { kind: 'burst', shape: 'ring', windup: 1.3, recover: 1.05, radius: 200, innerRadius: 115, damage: 15 },
  'void-fan': { kind: 'projectile', shape: 'beam', windup: 1.1, recover: 1.0, radius: 12, width: 12, length: 590, count: 5, speed: 280, damage: 15 },
  'shadow-sweep': { kind: 'burst', shape: 'beam', windup: 1.15, recover: 1.1, radius: 0, width: 48, length: 480, damage: 18 },
  'twilight-ground': { kind: 'zone', shape: 'circle', windup: 1.35, recover: 1.0, radius: 110, duration: 2.2, damage: 13 },
  'eclipse-wedge': { kind: 'zone', shape: 'arena', windup: 1.8, recover: 1.05, radius: 265, duration: 1.8, damage: 19 },
  'eclipse-cross': { kind: 'projectile', shape: 'beam', windup: 1.0, recover: 0.8, radius: 13, width: 13, length: 600, count: 7, speed: 305, damage: 17 },
  'seraph-finale': { kind: 'burst', shape: 'ring', windup: 1.9, recover: 1.4, radius: 290, innerRadius: 170, damage: 22 },
} as const satisfies Record<string, BossAttack>

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
    id: 'abyss-monarch', title: 'Abyss Monarch', color: '#a58aff', health: 2600,
    phaseNames: ['Veil of Dusk', 'Summoned Court', 'Abyssal Collapse'],
    phases: [['shadow-fan', 'darkness-field'], ['shadow-cross', 'abyss-summon', 'darkness-field'],
      ['abyss-collapse', 'shadow-storm', 'abyss-summon']],
    introCue: 'bosses:abyss-intro', transitionCue: 'bosses:abyss-transition',
    attackCue: 'bosses:abyss-strike', deathCue: 'bosses:abyss-defeat',
  },
  'frost-sovereign': {
    id: 'frost-sovereign', title: 'Frost Sovereign', color: '#9cddff', health: 2800,
    phaseNames: ['Winter Barrage', 'Frozen Bastion', 'Absolute Zero'],
    phases: [['ice-fan', 'frost-patch'], ['glacial-ring', 'rotating-shelter', 'ice-fan'],
      ['rotating-shelter', 'winter-burst', 'ice-storm']],
    introCue: 'bosses:frost-intro', transitionCue: 'bosses:frost-transition',
    attackCue: 'bosses:frost-strike', deathCue: 'bosses:frost-defeat',
  },
  'infernal-titan': {
    id: 'infernal-titan', title: 'Infernal Titan', color: '#ff9958', health: 3300,
    phaseNames: ['The Great Hammer', 'Molten Earth', 'Titan Enraged'],
    phases: [['titan-slam', 'ember-line'], ['eruption', 'flame-wave', 'titan-slam'],
      ['titan-rage', 'flame-wave', 'eruption']],
    introCue: 'bosses:infernal-intro', transitionCue: 'bosses:infernal-transition',
    attackCue: 'bosses:infernal-strike', deathCue: 'bosses:infernal-defeat',
  },
  'eclipse-seraph': {
    id: 'eclipse-seraph', title: 'Eclipse Seraph', color: '#ffe8a8', health: 3000,
    phaseNames: ['Light Ascendant', 'Dark Reversal', 'Total Eclipse'],
    phases: [['radiant-lance', 'light-ring'], ['void-fan', 'shadow-sweep', 'twilight-ground'],
      ['eclipse-wedge', 'eclipse-cross', 'seraph-finale']],
    introCue: 'bosses:seraph-intro', transitionCue: 'bosses:seraph-transition',
    attackCue: 'bosses:seraph-strike', deathCue: 'bosses:seraph-defeat',
  },
}
