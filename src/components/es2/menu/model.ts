import type { AbilityId, SkillRarity } from '../../../game/types'
import { upgradeKeyIndex } from '../../../game/input'

export type MenuView = 'main' | 'relics' | 'progression' | 'monsters' | 'skills' | 'achievements'
export type ChoiceKind = 'level' | 'evolution' | 'treasure'

export interface MenuChoice {
  id: string
  title: string
  description?: string
  icon?: string
  imageSrc?: string
  reducedMotionSrc?: string
  rarity?: SkillRarity | 'epic'
  level?: number
  maxLevel?: number
  requirements?: string
  evolution?: boolean
  disabled?: boolean
}
export interface RelicEntry extends MenuChoice { owned?: boolean; effect?: string }
export interface KeyInput {
  code: string; repeat: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean
}
export function shortcutIndex(event: KeyInput, length: number): number {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return -1
  const index = upgradeKeyIndex(event.code)
  return index >= 0 && index < length ? index : -1
}
export function nextIndex(current: number, direction: -1 | 1, count: number): number {
  return count <= 0 ? -1 : (current + direction + count) % count
}
export const upgradeCost = (tier: number): number => 25 * (tier + 1)
export function formatDuration(seconds: number): string {
  const duration = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  return `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`
}
export function abilityChoiceId(id: string, upgrades: readonly { id: AbilityId }[]): AbilityId | null {
  return upgrades.find(upgrade => upgrade.id === id)?.id ?? null
}
