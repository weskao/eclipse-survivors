import { createHero, createState } from '../../state'
import type { GameState, MobType, FxType } from '../../types'

export type StressPreset = 'desktop' | 'mobile-low'

/** Deterministic input fixture, not a replacement for the authoritative game loop.
 * No spawning, damage, or offscreen simulation code is modified.
 */
export function createStressScenario(preset: StressPreset): GameState {
  const state = createState()
  const hero = createHero('knight')
  hero.max = hero.hp = 100_000
  hero.inv = 100_000
  hero.attack = 100_000
  state.hero = hero
  state.mode = 'play'
  state.runMode = 'endless'
  state.spawnT = 100_000
  state.bossSpawned = true
  state.W = preset === 'desktop' ? 960 : 390
  state.H = preset === 'desktop' ? 540 : 844

  const mobTypes: readonly MobType[] = ['slime', 'bat', 'goblin', 'golem', 'warlock']
  for (let i = 0; i < 130; i++) {
    const angle = i * 2.399963229728653
    const distance = 65 + (i % 8) * 45
    state.mobs.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      type: i === 0 ? 'boss' : mobTypes[i % mobTypes.length]!,
      hp: 100_000, max: 100_000, r: i === 0 ? 46 : 18,
      speed: 30, dmg: 0, phase: i * 0.125,
      hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
      ...(i === 0 ? { bossPhase: 1 as const } : {}),
    })
  }
  for (let i = 0; i < 96; i++) {
    const angle = i * Math.PI * 2 / 96
    const distance = 40 + i % 8 * 8
    state.shots.push({
      x: Math.cos(angle) * distance, y: Math.sin(angle) * distance,
      vx: Math.cos(angle) * 280, vy: Math.sin(angle) * 280,
      kind: i % 2 ? 'magic' : 'arrow',
      d: 0, r: 5, life: 30,
    })
  }
  for (let i = 0; i < 64; i++) {
    const angle = i * Math.PI * 2 / 64
    state.enemyShots.push({
      x: Math.cos(angle) * 130, y: Math.sin(angle) * 130,
      vx: Math.cos(angle) * 30, vy: Math.sin(angle) * 30,
      radius: 6, damage: 0, life: 30,
    })
  }
  const effectTypes: readonly FxType[] = ['spark', 'footstep', 'ice', 'meteor', 'ember', 'vortex']
  for (let i = 0; i < 96; i++) {
    const angle = i * Math.PI * 2 / 96
    state.fx.push({
      x: Math.cos(angle) * (95 + i % 7 * 21),
      y: Math.sin(angle) * (95 + i % 7 * 21),
      vx: 0, vy: 0, life: 120, max: 120,
      r: 4 + i % 5, color: '#dcaaff', type: effectTypes[i % effectTypes.length]!,
    })
  }
  for (let i = 0; i < 48; i++) {
    state.numberFx.push({ x: i * 11 - 260, y: i % 8 * 30 - 120,
      life: 120, value: i + 1, boss: i % 9 === 0 })
  }
  return state
}
