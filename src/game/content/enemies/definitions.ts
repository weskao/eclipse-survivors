import { BALANCE } from '../../config'

/** Static, asset-independent definitions. Integration may map spriteKey/cues to its own assets. */
export const ENEMY_DEFINITIONS = {
  'shadow-assassin': {
    title: 'Shadow Assassin',
    ...BALANCE.enemies.factions['shadow-assassin'],
    spriteKey: 'factions/shadow-assassin', attackCue: 'factions.assassin.dash',
    deathCue: 'factions.shadow.death', telegraphColor: '#b796ff',
  },
  'necromancer': {
    title: 'Necromancer',
    ...BALANCE.enemies.factions['necromancer'],
    spriteKey: 'factions/necromancer', attackCue: 'factions.necromancer.summon',
    deathCue: 'factions.necromancer.death', telegraphColor: '#a8edbb',
  },
  'dark-archer': {
    title: 'Dark Archer',
    ...BALANCE.enemies.factions['dark-archer'],
    spriteKey: 'factions/dark-archer', attackCue: 'factions.archer.shot',
    deathCue: 'factions.archer.death', telegraphColor: '#ea98be',
  },
  'plague-carrier': {
    title: 'Plague Carrier',
    ...BALANCE.enemies.factions['plague-carrier'],
    spriteKey: 'factions/plague-carrier', attackCue: 'factions.plague.spill',
    deathCue: 'factions.plague.death', telegraphColor: '#b4ed64',
  },
  'shield-guardian': {
    title: 'Shield Guardian',
    ...BALANCE.enemies.factions['shield-guardian'],
    spriteKey: 'factions/shield-guardian', attackCue: 'factions.guardian.bash',
    deathCue: 'factions.guardian.death', telegraphColor: '#b9d5ff',
  },
  phantom: {
    title: 'Phantom',
    ...BALANCE.enemies.factions['phantom'],
    spriteKey: 'factions/phantom', attackCue: 'factions.phantom.strike',
    deathCue: 'factions.phantom.death', telegraphColor: '#d2a4ff',
  },
  'fire-imp': {
    title: 'Fire Imp',
    ...BALANCE.enemies.factions['fire-imp'],
    spriteKey: 'factions/fire-imp', attackCue: 'factions.imp.explosion',
    deathCue: 'factions.imp.death', telegraphColor: '#ff956f',
  },
  'frost-wraith': {
    title: 'Frost Wraith',
    ...BALANCE.enemies.factions['frost-wraith'],
    spriteKey: 'factions/frost-wraith', attackCue: 'factions.wraith.frost',
    deathCue: 'factions.wraith.death', telegraphColor: '#83defc',
  },
  berserker: {
    title: 'Berserker',
    ...BALANCE.enemies.factions['berserker'],
    spriteKey: 'factions/berserker', attackCue: 'factions.berserker.charge',
    deathCue: 'factions.berserker.death', telegraphColor: '#ff7f89',
  },
  'crystal-sentinel': {
    title: 'Crystal Sentinel',
    ...BALANCE.enemies.factions['crystal-sentinel'],
    spriteKey: 'factions/crystal-sentinel', attackCue: 'factions.sentinel.laser',
    deathCue: 'factions.sentinel.death', telegraphColor: '#df9dff',
  },
} as const

export type FactionKind = keyof typeof ENEMY_DEFINITIONS
export type FactionAffix = 'armored' | 'explosive' | 'swift' | 'vampiric' | 'frozen' | 'arcane'
export const ELITE_AFFIXES: readonly FactionAffix[] = [
  'armored', 'explosive', 'swift', 'vampiric', 'frozen', 'arcane',
]
