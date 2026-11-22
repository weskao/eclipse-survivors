/** Static, asset-independent definitions. Integration may map spriteKey/cues to its own assets. */
export const ENEMY_DEFINITIONS = {
  'shadow-assassin': {
    title: 'Shadow Assassin', hp: 68, radius: 18, speed: 122, range: 180,
    windup: 0.55, recover: 0.85, damage: 15, xp: 5,
    spriteKey: 'factions/shadow-assassin', attackCue: 'factions.assassin.dash',
    deathCue: 'factions.shadow.death', telegraphColor: '#b796ff',
  },
  'necromancer': {
    title: 'Necromancer', hp: 105, radius: 23, speed: 52, range: 280,
    windup: 0.95, recover: 2.9, damage: 7, xp: 9,
    spriteKey: 'factions/necromancer', attackCue: 'factions.necromancer.summon',
    deathCue: 'factions.necromancer.death', telegraphColor: '#a8edbb',
  },
  'dark-archer': {
    title: 'Dark Archer', hp: 59, radius: 19, speed: 87, range: 315,
    windup: 0.65, recover: 1.25, damage: 12, xp: 5,
    spriteKey: 'factions/dark-archer', attackCue: 'factions.archer.shot',
    deathCue: 'factions.archer.death', telegraphColor: '#ea98be',
  },
  'plague-carrier': {
    title: 'Plague Carrier', hp: 88, radius: 24, speed: 64, range: 130,
    windup: 0.72, recover: 2.1, damage: 7, xp: 6,
    spriteKey: 'factions/plague-carrier', attackCue: 'factions.plague.spill',
    deathCue: 'factions.plague.death', telegraphColor: '#b4ed64',
  },
  'shield-guardian': {
    title: 'Shield Guardian', hp: 175, radius: 28, speed: 58, range: 81,
    windup: 0.8, recover: 1.05, damage: 20, xp: 10,
    spriteKey: 'factions/shield-guardian', attackCue: 'factions.guardian.bash',
    deathCue: 'factions.guardian.death', telegraphColor: '#b9d5ff',
  },
  phantom: {
    title: 'Phantom', hp: 49, radius: 17, speed: 116, range: 110,
    windup: 0.5, recover: 1.15, damage: 13, xp: 6,
    spriteKey: 'factions/phantom', attackCue: 'factions.phantom.strike',
    deathCue: 'factions.phantom.death', telegraphColor: '#d2a4ff',
  },
  'fire-imp': {
    title: 'Fire Imp', hp: 44, radius: 16, speed: 101, range: 160,
    windup: 0.7, recover: 1.6, damage: 14, xp: 4,
    spriteKey: 'factions/fire-imp', attackCue: 'factions.imp.explosion',
    deathCue: 'factions.imp.death', telegraphColor: '#ff956f',
  },
  'frost-wraith': {
    title: 'Frost Wraith', hp: 66, radius: 19, speed: 76, range: 260,
    windup: 0.75, recover: 1.6, damage: 11, xp: 7,
    spriteKey: 'factions/frost-wraith', attackCue: 'factions.wraith.frost',
    deathCue: 'factions.wraith.death', telegraphColor: '#83defc',
  },
  berserker: {
    title: 'Berserker', hp: 125, radius: 22, speed: 105, range: 68,
    windup: 0.55, recover: 0.95, damage: 18, xp: 8,
    spriteKey: 'factions/berserker', attackCue: 'factions.berserker.charge',
    deathCue: 'factions.berserker.death', telegraphColor: '#ff7f89',
  },
  'crystal-sentinel': {
    title: 'Crystal Sentinel', hp: 160, radius: 27, speed: 42, range: 340,
    windup: 1.2, recover: 2, damage: 23, xp: 11,
    spriteKey: 'factions/crystal-sentinel', attackCue: 'factions.sentinel.laser',
    deathCue: 'factions.sentinel.death', telegraphColor: '#df9dff',
  },
} as const

export type FactionKind = keyof typeof ENEMY_DEFINITIONS
export type FactionAffix = 'armored' | 'explosive' | 'swift' | 'vampiric' | 'frozen' | 'arcane'
export const ELITE_AFFIXES: readonly FactionAffix[] = [
  'armored', 'explosive', 'swift', 'vampiric', 'frozen', 'arcane',
]
