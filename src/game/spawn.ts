// Mob spawning (original spawnMob + the spawn/boss section of update()).
import { BALANCE } from './config'
import { MAX_MOBS, TAU } from './constants'
import { getMode } from '../meta/modes'
import { rand, random } from './math'
import type { GameHooks, GameState, MobType } from './types'

const BASE_HP: Record<MobType, number> = BALANCE.enemies.baseHp

export function spawnMob(s: GameState, type?: 'boss', otherLiving = 0): void {
  const hero = s.hero
  // Boss spawns even when the normal crowd budget is exhausted.
  if (!hero || s.mobs.length + otherLiving >= MAX_MOBS + (type === 'boss' ? 1 : 0)) return
  const boss = type === 'boss'
  const r = Math.max(BALANCE.enemies.initialSpawnRadius, Math.min(s.W, s.H) * BALANCE.enemies.spawnRadiusScale) + rand(BALANCE.enemies.spawnRadiusMinOffset, BALANCE.enemies.spawnRadiusMaxOffset)
  const a = rand(0, TAU)
  const t: MobType = boss ? 'boss' : s.time >= BALANCE.enemies.warlockStartTime && random() < BALANCE.enemies.warlockChance ? 'warlock' : random() < 0.43 ? 'slime' : random() < 0.54 ? 'bat' : random() < 0.84 ? 'goblin' : 'golem'
  const lvl = Math.floor(s.time / BALANCE.enemies.levelPeriodSeconds)
  const elite = !boss && s.time >= BALANCE.enemies.eliteStartTime && random() < BALANCE.enemies.eliteChance
  const modifiers = getMode(s.runMode).modifiers
  const hp = Math.round((BASE_HP[t] + lvl * (t === 'boss' ? BALANCE.enemies.bossHpPerLevel : BALANCE.enemies.hpPerLevel)) * (elite ? BALANCE.enemies.eliteHpMultiplier : 1) * modifiers.enemyHp)
  s.mobs.push({
    x: hero.x + Math.cos(a) * r,
    y: hero.y + Math.sin(a) * r,
    type: t,
    hp,
    max: hp,
    r: t === 'boss' ? 48 : t === 'golem' ? 30 : t === 'warlock' ? 22 : t === 'goblin' ? 20 : 18,
    speed: t === 'boss' ? 51 : t === 'bat' ? 108 + lvl * 3 : t === 'golem' ? 48 + lvl * 2 : t === 'warlock' ? 66 + lvl * 2 : t === 'goblin' ? 69 + lvl * 3 : 77 + lvl * 3,
    dmg: Math.round((t === 'boss' ? BALANCE.enemies.bossDamage : (BALANCE.enemies.baseDamage + lvl * BALANCE.enemies.damagePerLevel) * (elite ? BALANCE.enemies.eliteDamageMultiplier : 1)) * modifiers.enemyDamage),
    elite,
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

/** Counts down `spawnT`, spawns the wave (plus a 32%+ extra after 38s) and the boss after 92s. */
export function tickSpawning(s: GameState, dt: number, hooks: GameHooks, spawnBoss?: (state: GameState, hooks: GameHooks) => void, otherLiving = 0): void {
  s.spawnT -= dt
  if (s.spawnT <= 0) {
    s.spawnT = spawnInterval(s.time, s.currentScene, getMode(s.runMode).modifiers.spawnFrequency)
    spawnMob(s, undefined, otherLiving)
    if (s.time > BALANCE.enemies.extraSpawnAfterSeconds && random() < BALANCE.enemies.extraSpawnChance + sceneBonus(s.currentScene)) spawnMob(s, undefined, otherLiving)
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
