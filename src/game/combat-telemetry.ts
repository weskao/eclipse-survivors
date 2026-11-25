import type { GameState } from './types'

export interface CombatSample { seconds: number; xp: number; kills: number; dps: number; enemies: number; killsPerMinute: number }
export interface CombatTelemetry { xpEarned: number; firstUpgradeAt: number | null; nextSampleAt: number; samples: CombatSample[] }
const INTERVAL = 10
const MAX_SAMPLES = 120
export function emptyCombatTelemetry(): CombatTelemetry {
  return { xpEarned: 0, firstUpgradeAt: null, nextSampleAt: INTERVAL, samples: [] }
}

/** Sample actual simulation data once per ten gameplay seconds, independent of rendering quality. */
export function sampleCombat(s: GameState, factionEnemies?: readonly { hp: number }[]): void {
  const t = s.combatTelemetry
  if (s.time < t.nextSampleAt) return
  const seconds = s.time
  let enemies = 0
  if (factionEnemies) for (const enemy of factionEnemies) if (enemy.hp > 0) enemies++
  for (const mob of s.mobs) if (mob.hp > 0) enemies++
  if (t.samples.length >= MAX_SAMPLES) t.samples.shift()
  t.samples.push({ seconds, xp: t.xpEarned, kills: s.kill, dps: s.damageDealt / seconds, enemies, killsPerMinute: s.kill * 60 / seconds })
  t.nextSampleAt = (Math.floor(seconds / INTERVAL) + 1) * INTERVAL
}
