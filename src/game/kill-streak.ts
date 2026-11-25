import { BALANCE } from './config'
import type { GameHooks, GameState } from './types'

export interface KillStreak {
  current: number
  best: number
  burst: number
  bestBurst: number
  lastKillAt: number
  burstStartedAt: number
  milestone: number
  pendingMilestone: number
}

export function emptyKillStreak(): KillStreak {
  return { current: 0, best: 0, burst: 0, bestBurst: 0, lastKillAt: -Infinity, burstStartedAt: -Infinity, milestone: 0, pendingMilestone: 0 }
}

/** Game time, not the ambient/render clock, freezes during every gameplay overlay. */
export function expireKillStreak(state: GameState): void {
  const streak = state.killStreak
  if (state.time - streak.lastKillAt > BALANCE.combat.killStreakWindow) { streak.current = 0; streak.milestone = 0; streak.pendingMilestone = 0 }
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
  if (BALANCE.combat.killStreakMilestones.includes(streak.current)) streak.pendingMilestone = streak.current
  streak.best = Math.max(streak.best, streak.current)
  streak.bestBurst = Math.max(streak.bestBurst, streak.burst)
}

const MILESTONE_LABELS: Readonly<Record<number, string>> = {
  10: '殺戮序曲', 25: '狂暴殺戮', 50: '無盡屠戮', 100: '毀滅狂潮', 200: '暮光浩劫', 500: '神之殲滅',
}

/** One announcement and one layered cue for the highest milestone crossed in a tick. */
export function flushKillMilestone(state: GameState, hooks: GameHooks): void {
  const streak = state.killStreak
  if (!streak.pendingMilestone) return
  streak.milestone = streak.pendingMilestone
  streak.pendingMilestone = 0
  hooks.message(MILESTONE_LABELS[streak.milestone]!)
  hooks.sfx('killStreak')
}
