import { TAU } from '../constants'
import type { GameState, Hero } from '../types'

export type HeroPose = 'idle' | 'run' | 'attack' | 'cast' | 'dash' | 'hurt' | 'death' | 'victory'

export interface HeroAnimation {
  pose: HeroPose
  frame: number
  count: number
  phase: number
  reducedMotion: boolean
}

const FRAMES: Record<HeroPose, number> = {
  idle: 6, run: 8, attack: 6, cast: 6, dash: 5, hurt: 3, death: 6, victory: 8,
}

// Rendering-only history. Weak keys let old runs/characters be collected without
// touching combat state or requiring a parallel animation update loop.
const entered = new WeakMap<Hero, { pose: HeroPose; clock: number; reduced: boolean }>()

function poseFor(s: GameState, hero: Hero): HeroPose {
  if (hero.hp <= 0) return 'death'
  if (s.mode === 'result') return 'victory'
  if (hero.dash > 0) return 'dash'
  // Dash i-frames last <= .35 s; damage i-frames start at .8 s.
  if (hero.inv > 0.45) return 'hurt'
  if (hero.strike > 0) return s.choice === 'wizard' ? 'cast' : 'attack'
  return hero.moveAmount > 0.15 ? 'run' : 'idle'
}

const clamp = (v: number): number => Math.max(0, Math.min(1, v))

/** A deterministic visual sample; no changes to damage, movement, AI or timers. */
export function sampleHeroAnimation(s: GameState, hero: Hero, reducedMotion = false): HeroAnimation {
  const pose = poseFor(s, hero)
  const count = FRAMES[pose]
  const old = entered.get(hero)
  if (!old || old.pose !== pose || old.reduced !== reducedMotion || s.worldClock < old.clock) {
    entered.set(hero, { pose, clock: s.worldClock, reduced: reducedMotion })
  }
  const start = entered.get(hero)!
  if (reducedMotion || s.mode === 'paused' || s.mode === 'level') {
    return { pose, frame: 0, count, phase: 0, reducedMotion }
  }
  const elapsed = Math.max(0, s.worldClock - start.clock)
  let progress = 0
  switch (pose) {
    case 'run':
      progress = ((hero.step % TAU) + TAU) % TAU / TAU
      break
    case 'idle':
      progress = (elapsed * 0.75) % 1
      break
    case 'attack':
    case 'cast':
      // The brief contact hold is a visual-only hit-stop. Simulation never stalls.
      progress = clamp((1 - clamp(hero.strike / 0.29) - 0.10) / 0.90)
      break
    case 'dash':
      progress = clamp(1 - hero.dash / 0.22)
      break
    case 'hurt':
      progress = clamp(1 - hero.inv / 0.8)
      break
    case 'death':
      progress = clamp(elapsed / 0.80)
      break
    case 'victory':
      progress = (elapsed / 1.20) % 1
      break
  }
  const loop = pose === 'idle' || pose === 'run' || pose === 'victory'
  const frame = Math.min(count - 1, Math.floor(progress * (loop ? count : count - 1)))
  return { pose, frame, count, phase: progress, reducedMotion }
}
