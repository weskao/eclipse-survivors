import { BALANCE } from './config'
import type { MobType } from './types'
import { ENEMY_DEFINITIONS, type FactionKind } from './content/enemies/definitions'
import { BOSS_DEFINITIONS, type BossId } from './content/bosses/definitions'

export type MonsterId = MobType | FactionKind | BossId
export type MonsterKills = Partial<Record<MonsterId, number>>
export const LEGACY_MONSTER_IDS = Object.keys(BALANCE.enemies.baseHp) as MobType[]
export const MONSTER_IDS: readonly MonsterId[] = [
  ...LEGACY_MONSTER_IDS, ...Object.keys(ENEMY_DEFINITIONS) as FactionKind[], ...Object.keys(BOSS_DEFINITIONS) as BossId[],
]
export function isFactionMonster(id: MonsterId): id is FactionKind { return Object.hasOwn(ENEMY_DEFINITIONS, id) }
export function isNamedBoss(id: MonsterId): id is BossId { return Object.hasOwn(BOSS_DEFINITIONS, id) }
export function validMonsterKills(value: unknown): value is MonsterKills {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(value).every(([id, count]) => MONSTER_IDS.includes(id as MonsterId) &&
      typeof count === 'number' && Number.isSafeInteger(count) && count >= 0)
}
export function mergeMonsterKills(base: MonsterKills, additions: MonsterKills): MonsterKills {
  const result = { ...base }
  for (const id of MONSTER_IDS) {
    const count = additions[id] ?? 0
    if (count > 0) result[id] = Math.min(Number.MAX_SAFE_INTEGER, (result[id] ?? 0) + count)
  }
  return result
}
export function runMonsterKills(legacy: Partial<Record<MobType, number>>, factions: Partial<Record<FactionKind, number>>, bosses: Partial<Record<BossId, number>>): MonsterKills {
  const namedCount = Object.values(bosses).reduce((sum, count) => sum + (count ?? 0), 0)
  return { ...legacy, boss: Math.max(0, (legacy.boss ?? 0) - namedCount), ...factions, ...bosses }
}
