// Mob spawning (original spawnMob + the spawn/boss section of update()).
import { BOSS_TIME, MAX_MOBS, TAU } from './constants'
import { rand, random } from './math'
import type { GameHooks, GameState, MobType } from './types'

const BASE_HP: Record<MobType, number> = { slime: 32, bat: 27, goblin: 55, golem: 155, boss: 2000 }

export function spawnMob(s: GameState, type?: 'boss'): void {
  const hero = s.hero
  // Boss spawns even when the normal crowd budget is exhausted.
  if (!hero || s.mobs.length >= MAX_MOBS + (type === 'boss' ? 1 : 0)) return
  const boss = type === 'boss'
  const r = Math.max(200, Math.min(s.W, s.H) * 0.38) + rand(15, 65)
  const a = rand(0, TAU)
  const t: MobType = boss ? 'boss' : random() < 0.43 ? 'slime' : random() < 0.54 ? 'bat' : random() < 0.84 ? 'goblin' : 'golem'
  const lvl = Math.floor(s.time / 22)
  const hp = BASE_HP[t] + lvl * (t === 'boss' ? 120 : 9)
  s.mobs.push({
    x: hero.x + Math.cos(a) * r,
    y: hero.y + Math.sin(a) * r,
    type: t,
    hp,
    max: hp,
    r: t === 'boss' ? 48 : t === 'golem' ? 30 : t === 'goblin' ? 20 : 18,
    speed: t === 'boss' ? 51 : t === 'bat' ? 108 + lvl * 3 : t === 'golem' ? 48 + lvl * 2 : t === 'goblin' ? 69 + lvl * 3 : 77 + lvl * 3,
    dmg: t === 'boss' ? 32 : 11 + lvl * 2,
    phase: rand(0, 8),
    hit: 0,
    slow: 0,
    stagger: 0,
    kx: 0,
    ky: 0,
  })
}

export const sceneBonus = (currentScene: number): number => (currentScene === 1 ? 0.05 : currentScene === 3 ? 0.08 : 0)

export const spawnInterval = (time: number, currentScene: number): number =>
  Math.max(0.18, 0.75 - time * 0.003 - sceneBonus(currentScene))

/** Counts down `spawnT`, spawns the wave (plus a 32%+ extra after 38s) and the boss after 92s. */
export function tickSpawning(s: GameState, dt: number, hooks: GameHooks): void {
  s.spawnT -= dt
  if (s.spawnT <= 0) {
    s.spawnT = spawnInterval(s.time, s.currentScene)
    spawnMob(s)
    if (s.time > 38 && random() < 0.32 + sceneBonus(s.currentScene)) spawnMob(s)
  }
  if (!s.bossSpawned && s.time > BOSS_TIME) {
    s.bossSpawned = true
    spawnMob(s, 'boss')
    hooks.sfx('boss')
    hooks.message('⚠ 魔王降臨！')
  }
}
