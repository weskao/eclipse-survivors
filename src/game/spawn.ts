// Mob spawning (original spawnMob + the spawn/boss section of update()).
import { MAX_MOBS, TAU } from './constants'
import { getMode } from '../meta/modes'
import { rand, random } from './math'
import type { GameHooks, GameState, Mob, MobType } from './types'
import type { SpawnRequest } from './content/director'

const BASE_HP: Record<MobType, number> = { slime: 32, bat: 27, goblin: 55, golem: 155, warlock: 72, boss: 2000 }

/** One authoritative mob constructor for legacy opening spawns and directed waves. */
function makeMob(s: GameState, type: MobType, elite: boolean, x: number, y: number, phase: number): Mob {
  const lvl = Math.floor(s.time / 22)
  const boss = type === 'boss'
  const modifiers = getMode(s.runMode).modifiers
  const hp = Math.round((BASE_HP[type] + lvl * (boss ? 120 : 9)) * (elite ? 1.7 : 1) * modifiers.enemyHp)
  return {
    x, y, type, hp, max: hp,
    r: boss ? 48 : type === 'golem' ? 30 : type === 'warlock' ? 22 : type === 'goblin' ? 20 : 18,
    speed: boss ? 51 : type === 'bat' ? 108 + lvl * 3 : type === 'golem' ? 48 + lvl * 2 : type === 'warlock' ? 66 + lvl * 2 : type === 'goblin' ? 69 + lvl * 3 : 77 + lvl * 3,
    dmg: Math.round((boss ? 32 : (11 + lvl * 2) * (elite ? 1.35 : 1)) * modifiers.enemyDamage),
    elite, phase, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
  }
}

export function spawnMob(s: GameState, type?: 'boss', otherLiving = 0): void {
  const hero = s.hero
  if (!hero || s.mobs.length + otherLiving >= MAX_MOBS + (type === 'boss' ? 1 : 0)) return
  const boss = type === 'boss'
  const r = Math.max(200, Math.min(s.W, s.H) * 0.38) + rand(15, 65)
  const a = rand(0, TAU)
  const t: MobType = boss ? 'boss' : s.time >= 28 && random() < 0.12 ? 'warlock' : random() < 0.43 ? 'slime' : random() < 0.54 ? 'bat' : random() < 0.84 ? 'goblin' : 'golem'
  const elite = !boss && s.time >= 42 && random() < 0.085
  s.mobs.push(makeMob(s, t, elite, hero.x + Math.cos(a) * r, hero.y + Math.sin(a) * r, rand(0, 8)))
}

/** Exact coordinates, kind, elite flag and warning from the accepted director request. */
export function spawnDirectedMob(s: GameState, req: SpawnRequest, otherLiving = 0): Mob | null {
  if (!s.hero || s.mode !== 'play' || s.mobs.length + otherLiving >= MAX_MOBS ||
      !Number.isFinite(req.x) || !Number.isFinite(req.y) ||
      !Number.isFinite(req.telegraphSeconds) || req.telegraphSeconds < 0) return null
  const actor = makeMob(s, req.type, req.elite, req.x, req.y, 0)
  actor.waveIndex = req.waveIndex
  actor.telegraphUntil = s.time + req.telegraphSeconds
  s.mobs.push(actor)
  return actor
}

export const sceneBonus = (currentScene: number): number => (currentScene === 1 ? 0.05 : currentScene === 3 ? 0.08 : 0)

export const spawnInterval = (time: number, currentScene: number, frequency = 1): number =>
  Math.max(0.18, 0.75 - time * 0.003 - sceneBonus(currentScene)) / frequency

/** Counts down `spawnT`, spawns the wave (plus a 32%+ extra after 38s) and the boss after 92s. */
export function tickSpawning(s: GameState, dt: number, hooks: GameHooks, spawnBoss?: (state: GameState, hooks: GameHooks) => void, otherLiving = 0): void {
  s.spawnT -= dt
  if (s.spawnT <= 0) {
    s.spawnT = spawnInterval(s.time, s.currentScene, getMode(s.runMode).modifiers.spawnFrequency)
    spawnMob(s, undefined, otherLiving)
    if (s.time > 38 && random() < 0.32 + sceneBonus(s.currentScene)) spawnMob(s, undefined, otherLiving)
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
