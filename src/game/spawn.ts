// Mob spawning (original spawnMob + the spawn/boss section of update()).
import { BALANCE } from './config'
import { describeWave, type OrdinaryEncounter } from './content/director'
import { MAX_MOBS, TAU } from './constants'
import { getMode } from '../meta/modes'
import { rand, random } from './math'
import type { GameHooks, GameState, MobType } from './types'
import { pointIsClear } from './world'

const BASE_HP: Record<MobType, number> = BALANCE.enemies.baseHp

interface OrdinarySpawn { type: MobType; elite: boolean; angle?: number; rewardXpMultiplier?: number }

export function spawnMob(s: GameState, type?: 'boss', otherLiving = 0, planned?: OrdinarySpawn): void {
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
  if (planned) {
    const distance = Math.max(r, Math.min(1600, Math.hypot(s.W / 2 + 32, s.H / 2 + 32)))
    let safe = false
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = a + attempt * 0.71
      x = hero.x + Math.cos(angle) * distance
      y = hero.y + Math.sin(angle) * distance
      if (pointIsClear(s.currentScene, { x, y }, 32)) { safe = true; break }
    }
    if (!safe) return
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
  return describeWave(s.runMode, 0, s.time).stage !== 'recovery'
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

/** Counts down `spawnT`, spawns the wave (plus a 32%+ extra after 38s) and the boss after 92s. */
export function tickSpawning(s: GameState, dt: number, hooks: GameHooks, spawnBoss?: (state: GameState, hooks: GameHooks) => void, otherLiving = 0): void {
  s.spawnT -= dt
  if (s.spawnT <= 0) {
    const wave = describeWave(s.runMode, 0, s.time)
    const stage = wave.stage
    const frequency = getMode(s.runMode).modifiers.spawnFrequency
    const multiplier = stage === 'assault' ? BALANCE.enemies.assaultIntervalMultiplier
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
        spawnMob(s, undefined, otherLiving)
        if (s.time > BALANCE.enemies.extraSpawnAfterSeconds && random() < BALANCE.enemies.extraSpawnChance + sceneBonus(s.currentScene)) spawnMob(s, undefined, otherLiving)
      }
    }
  }
  if (!s.bossSpawned && s.time > getMode(s.runMode).bossAt) {
    if (spawnBoss) spawnBoss(s, hooks)
    else {
      s.bossSpawned = true
      spawnMob(s, 'boss')
      hooks.sfx('boss')
      hooks.message('⚠ 魔王降臨！')
    }
  }
}
