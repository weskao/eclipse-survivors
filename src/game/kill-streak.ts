import { BALANCE } from './config'
import type { GameState } from './types'

export interface KillStreak {
  current: number
  best: number
  burst: number
  bestBurst: number
  lastKillAt: number
  burstStartedAt: number
}

export function emptyKillStreak(): KillStreak {
  return { current: 0, best: 0, burst: 0, bestBurst: 0, lastKillAt: -Infinity, burstStartedAt: -Infinity }
}

/** Game time, not the ambient/render clock, freezes during every gameplay overlay. */
export function expireKillStreak(state: GameState): void {
  const streak = state.killStreak
  if (state.time - streak.lastKillAt > BALANCE.combat.killStreakWindow) streak.current = 0
  if (state.time - streak.burstStartedAt > BALANCE.combat.multiKillWindow) streak.burst = 0
}

/** Call exactly once from the authoritative death/reward transaction, never from rendering or despawn. */
export function recordKill(state: GameState): void {
  expireKillStreak(state)
  const streak = state.killStreak
  state.kill++
  streak.lastKillAt = state.time
  streak.current++
  if (streak.burst === 0) streak.burstStartedAt = state.time
  streak.burst++
  streak.best = Math.max(streak.best, streak.current)
  streak.bestBurst = Math.max(streak.bestBurst, streak.burst)
}
