// Mob spawning (original spawnMob + the spawn/boss section of update()).
import { BALANCE } from './config'
import { describeWave, type OrdinaryEncounter } from './content/director'
import { MAX_MOBS, TAU } from './constants'
import { getMode } from '../meta/modes'
import { rand, random } from './math'
import type { GameHooks, GameState, MobType } from './types'
import { pointIsClear } from './world'
import type { FactionBridge } from './content/enemies/integration'
import { ENEMY_DEFINITIONS, type FactionKind } from './content/enemies/definitions'

const FACTION_IDS = Object.keys(ENEMY_DEFINITIONS) as FactionKind[]
const FACTION_COMPOSITIONS: Partial<Record<OrdinaryEncounter, readonly FactionKind[]>> = {
  'swarm-rush': ['fire-imp', 'phantom'], encirclement: ['shadow-assassin', 'phantom'],
  'elite-invasion': ['shield-guardian', 'berserker'], 'ranged-assault': ['dark-archer', 'frost-wraith'],
  'titan-march': ['crystal-sentinel', 'shield-guardian'], 'treasure-rush': ['necromancer', 'plague-carrier'],
  'eclipse-surge': ['crystal-sentinel', 'shadow-assassin'],
}
const BASE_HP: Record<MobType, number> = BALANCE.enemies.baseHp

interface OrdinarySpawn { type: MobType; elite: boolean; angle?: number; rewardXpMultiplier?: number }

/** Bounded placement search shared by ordinary and faction waves, including the opening. */
function clearSpawnPoint(s: GameState, angle: number, radiusX: number, radiusY = radiusX) {
  const hero = s.hero!
  for (let attempt = 0; attempt < 8; attempt++) {
    const theta = angle + attempt * .71
    const x = hero.x + Math.cos(theta) * radiusX, y = hero.y + Math.sin(theta) * radiusY
    if (pointIsClear(s.currentScene, { x, y }, 32)) return { x, y }
  }
  return null
}

export function spawnMob(s: GameState, type?: 'boss', otherLiving = 0, planned?: OrdinarySpawn, safePlacement: boolean | 'opening' = false): void {
  const hero = s.hero
  // Boss spawns even when the normal crowd budget is exhausted.
  if (!hero || s.mobs.length + otherLiving >= MAX_MOBS + (type === 'boss' ? 1 : 0)) return
  const boss = type === 'boss'
  const r = Math.max(BALANCE.enemies.initialSpawnRadius, Math.min(s.W, s.H) * BALANCE.enemies.spawnRadiusScale) + rand(BALANCE.enemies.spawnRadiusMinOffset, BALANCE.enemies.spawnRadiusMaxOffset)
  const a = planned?.angle ?? rand(0, TAU)
  const t: MobType = boss ? 'boss' : planned?.type ?? (s.time >= BALANCE.enemies.warlockStartTime && random() < BALANCE.enemies.warlockChance ? 'warlock' : random() < 0.43 ? 'slime' : random() < 0.54 ? 'bat' : random() < 0.84 ? 'goblin' : 'golem')
  const lvl = Math.floor(s.time / BALANCE.enemies.levelPeriodSeconds)
  const elite = !boss && (planned?.elite ?? (s.time >= BALANCE.enemies.eliteStartTime && random() < BALANCE.enemies.eliteChance))
  const modifiers = getMode(s.runMode).modifiers
  const hp = Math.round((BASE_HP[t] + lvl * (t === 'boss' ? BALANCE.enemies.bossHpPerLevel : BALANCE.enemies.hpPerLevel)) * (elite ? BALANCE.enemies.eliteHpMultiplier : 1) * modifiers.enemyHp)
  let x = hero.x + Math.cos(a) * r, y = hero.y + Math.sin(a) * r
  if (planned || safePlacement) {
    // Keep the existing nearby opening ring; later pulses remain offscreen.
    const distance = safePlacement === 'opening' ? r : Math.max(r, Math.min(1600, Math.hypot(s.W / 2 + 32, s.H / 2 + 32)))
    const point = clearSpawnPoint(s, a, distance)
    if (!point) return
    x = point.x; y = point.y
  }
  s.mobs.push({
    x,
    y,
    type: t,
    hp,
    max: hp,
    r: t === 'boss' ? 48 : t === 'golem' ? 30 : t === 'warlock' ? 22 : t === 'goblin' ? 20 : 18,
    speed: t === 'boss' ? 51 : t === 'bat' ? 108 + lvl * 3 : t === 'golem' ? 48 + lvl * 2 : t === 'warlock' ? 66 + lvl * 2 : t === 'goblin' ? 69 + lvl * 3 : 77 + lvl * 3,
    dmg: Math.round((t === 'boss' ? BALANCE.enemies.bossDamage : (BALANCE.enemies.baseDamage + lvl * BALANCE.enemies.damagePerLevel) * (elite ? BALANCE.enemies.eliteDamageMultiplier : 1)) * modifiers.enemyDamage),
    elite,
    ...(planned?.rewardXpMultiplier ? { rewardXpMultiplier: planned.rewardXpMultiplier } : {}),
    phase: rand(0, 8),
    hit: 0,
    slow: 0,
    stagger: 0,
    kx: 0,
    ky: 0,
  })
}

export const sceneBonus = (currentScene: number): number => BALANCE.enemies.sceneSpawnBonuses[currentScene] ?? 0

export const spawnInterval = (time: number, currentScene: number, frequency = 1): number =>
  Math.max(BALANCE.enemies.intervalFloor, BALANCE.enemies.intervalBase - time * BALANCE.enemies.intervalTimeFactor - sceneBonus(currentScene)) / frequency

export function ordinarySpawnsAllowed(s: GameState): boolean {
  return describeWave(s.runMode, s.directorSeed, s.time).stage !== 'recovery'
}

/** Only called on a spawn pulse, never in the render loop. */
function encounterSpawn(encounter: OrdinaryEncounter, index: number, angle: number): OrdinarySpawn | undefined {
  switch (encounter) {
    case 'swarm-rush': return { type: index % 2 ? 'bat' : 'slime', elite: false, angle }
    case 'encirclement': return { type: 'goblin', elite: false, angle: angle + index * Math.PI * 0.75 }
    case 'elite-invasion': return { type: index % 2 ? 'goblin' : 'golem', elite: true, angle }
    case 'ranged-assault': return { type: index % 2 ? 'slime' : 'warlock', elite: false, angle }
    case 'titan-march': return { type: 'golem', elite: index % 2 === 0, angle }
    case 'treasure-rush': return { type: 'goblin', elite: false, angle, rewardXpMultiplier: BALANCE.combat.treasureRushXpMultiplier }
    case 'eclipse-surge': return { type: index % 2 ? 'warlock' : 'goblin', elite: index % 2 === 0, angle }
    default: return undefined
  }
}

/** The only ordinary spawn scheduler, including initial and faction reinforcements. */
export function spawnOpeningWave(s: GameState, factions?: FactionBridge): void {
  if (!s.hero) return
  for (let i = 0; i < 12; i++) spawnMob(s, undefined, factions?.runtime.enemies.length ?? 0, undefined, 'opening')
  if (!factions) return
  for (let i = 0; i < 4 && factions.availableSpawnSlots(s) > 0; i++) {
    const kind = FACTION_IDS[s.factionSpawnSequence++ % FACTION_IDS.length]!
    const point = clearSpawnPoint(s, i * Math.PI / 2, 320, 230)
    if (point) factions.spawn(s, kind, point.x, point.y)
  }
}

function factionPulse(s: GameState, factions: FactionBridge, encounter: OrdinaryEncounter, allow: boolean): void {
  const window = Math.floor(s.time / BALANCE.enemies.factionSpawnInterval)
  if (window <= s.factionSpawnWindow) return
  s.factionSpawnWindow = window
  const hero = s.hero
  if (!allow || !hero || factions.availableSpawnSlots(s) === 0) return
  const roster = FACTION_COMPOSITIONS[encounter] ?? FACTION_IDS
  const sequence = s.factionSpawnSequence++
  const radius = Math.min(1600, Math.max(320, Math.hypot(s.W / 2 + 36, s.H / 2 + 36)))
  const point = clearSpawnPoint(s, sequence * 2.399963229728653, radius)
  if (!point) return
  const affix = encounter === 'elite-invasion' || encounter === 'titan-march' ? factions.chooseAffix() : null
  factions.spawn(s, roster[sequence % roster.length]!, point.x, point.y, { ...(affix ? {affix} : {}), ...(encounter === 'treasure-rush' ? {rewardXpMultiplier:BALANCE.combat.treasureRushXpMultiplier} : {}) })
}

/** Counts down `spawnT`, spawns the wave (plus a 32%+ extra after 38s) and the boss after 92s. */
export function tickSpawning(s: GameState, dt: number, hooks: GameHooks, spawnBoss?: (state: GameState, hooks: GameHooks) => void, otherLiving = 0, factions?: FactionBridge): void {
  s.spawnT -= dt
  if (s.spawnT <= 0) {
    const wave = describeWave(s.runMode, s.directorSeed, s.time)
    const stage = wave.stage
    const frequency = getMode(s.runMode).modifiers.spawnFrequency
    const multiplier = stage === 'assault' ? BALANCE.enemies.assaultIntervalMultiplier * BALANCE.enemies.encounterIntervalMultipliers[wave.encounter]
      : stage === 'reward' ? BALANCE.enemies.rewardIntervalMultiplier : 1
    s.spawnT = Math.max(BALANCE.enemies.intervalFloor / frequency, spawnInterval(s.time, s.currentScene, frequency) * multiplier)
    if (stage !== 'recovery') {
      if (stage === 'assault') {
        const angle = rand(0, TAU)
        const index = Math.floor(s.time / Math.max(s.spawnT, 0.18))
        const plan = encounterSpawn(wave.encounter, index, angle)
        // Keep one clear sector in a pincer; never create a full blocking ring.
        spawnMob(s, undefined, otherLiving, wave.encounter === 'elite-invasion' ? encounterSpawn(wave.encounter, 0, angle) : plan)
        if (wave.encounter === 'encirclement' || wave.encounter === 'swarm-rush' || (s.time > BALANCE.enemies.extraSpawnAfterSeconds && random() < BALANCE.enemies.extraSpawnChance + sceneBonus(s.currentScene))) {
          spawnMob(s, undefined, otherLiving, encounterSpawn(wave.encounter, index + 1, angle + Math.PI * 0.5))
        }
      } else {
        spawnMob(s, undefined, otherLiving, undefined, true)
        if (s.time > BALANCE.enemies.extraSpawnAfterSeconds && random() < BALANCE.enemies.extraSpawnChance + sceneBonus(s.currentScene)) spawnMob(s, undefined, otherLiving, undefined, true)
      }
    }
    if (factions) factionPulse(s, factions, wave.encounter, stage !== 'recovery')
  }
  if (!s.bossSpawned && s.time > getMode(s.runMode).bossAt) {
    if (spawnBoss) spawnBoss(s, hooks)
    else {
      s.bossSpawned = true
      spawnMob(s, 'boss', factions?.runtime.enemies.length ?? otherLiving)
      hooks.sfx('boss')
      hooks.message('⚠ 魔王降臨！')
    }
  }
}
