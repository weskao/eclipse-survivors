import { TAU } from '../constants'
import type { GameState, Hero } from '../types'

export type HeroPose = 'idle' | 'run' | 'attack' | 'cast' | 'dash' | 'hurt' | 'death' | 'victory'

export interface HeroAnimation {
  pose: HeroPose
  frame: number
  count: number
  phase: number
  /** Screen-space octant: E, SE, S, SW, W, NW, N, NE. */
  direction: number
  reducedMotion: boolean
  /** True while the selected new hero's active skill is visually playing. */
  special?: boolean
  /** Projectile is created at attack start; subsequent strike frames are release/recovery. */
  actionStage?: 'windup' | 'hold' | 'release' | 'recover' | 'none'
}

const FRAMES: Record<HeroPose, number> = {
  idle: 8, run: 10, attack: 12, cast: 12, dash: 6, hurt: 4, death: 8, victory: 8,
}

// Rendering-only history. Weak keys let old runs/characters be collected without
// touching combat state or requiring a parallel animation update loop.
const entered = new WeakMap<Hero, { pose: HeroPose; clock: number; reduced: boolean; direction: number }>()
const lastSpecialActivation = new WeakMap<Hero, number>()
export function markHeroSpecialAnimation(hero: Hero, worldClock: number): void {
  if (Number.isFinite(worldClock)) lastSpecialActivation.set(hero, worldClock)
}

function octant(angle: number): number {
  return ((Math.round(angle / (TAU / 8)) % 8) + 8) % 8
}

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
  const triggered = lastSpecialActivation.get(hero)
  const special = s.mode === 'play' && hero.hp > 0 && triggered !== undefined
    && s.worldClock >= triggered && s.worldClock - triggered < 0.56
  const pose = special ? 'cast' : poseFor(s, hero)
  const count = FRAMES[pose]
  const old = entered.get(hero)
  const attacking = pose === 'attack' || pose === 'cast'
  const running = pose === 'run' && (hero.vx * hero.vx + hero.vy * hero.vy > 1)
  const direction = attacking ? octant(hero.aimAngle)
    : running ? octant(Math.atan2(hero.vy, hero.vx))
      : old?.direction ?? (hero.face < 0 ? 4 : 0)
  if (!old || old.pose !== pose || old.reduced !== reducedMotion || s.worldClock < old.clock) {
    entered.set(hero, { pose, clock: s.worldClock, reduced: reducedMotion, direction })
  } else old.direction = direction
  const start = entered.get(hero)!
  if (reducedMotion || s.mode === 'paused' || s.mode === 'level') {
    const actionStage = attacking ? 'release' : 'none'
    return { pose, frame: 0, count, phase: 0, direction, reducedMotion, actionStage, special }
  }
  const elapsed = Math.max(0, s.worldClock - start.clock)
  let progress = 0
  if (special && triggered !== undefined) progress = clamp((s.worldClock - triggered) / 0.56)
  else switch (pose) {
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
  const frame = Math.min(count - 1, Math.floor(progress * count))
  // attack() spawns the real projectile on the same tick it starts strike.
  // Never imply a loaded arrow or held spell during release/recover frames.
  const actionStage: NonNullable<HeroAnimation['actionStage']> = attacking
    ? progress < 0.22 ? 'release' : 'recover'
    : hero.attack <= Math.max(0.08, hero.delay * 0.24)
      ? hero.attack > Math.max(0.03, hero.delay * 0.08) ? 'windup' : 'hold'
      : 'none'
  return { pose, frame, count, phase: progress, direction, reducedMotion, actionStage, special }
}
