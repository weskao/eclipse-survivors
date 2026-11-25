import type { AbilityId, SkillRarity } from '../../../game/types'
import type { RunModeId } from '../../../meta/types'
import { upgradeKeyIndex } from '../../../game/input'
import type { MasteryStatChange } from '../../../game/content/heroes/mastery-preview'

/** Shared expedition icon identity for chooser cards and the selected-mode dock. */
export const MODE_SIGILS: Readonly<Record<RunModeId, string>> = {
  quick: '✦', standard: '♜', endless: '∞', challenge: 'ϟ',
  'boss-rush': '♛', 'endless-eclipse': '☾', 'relic-hunt': '◇',
  'cursed-expedition': '✧', 'chaos-arena': '✵',
}

export type MenuView = 'main' | 'relics' | 'progression' | 'monsters' | 'skills' | 'achievements'
export type ChoiceKind = 'level' | 'evolution' | 'treasure'

export interface MenuChoice {
  id: string
  title: string
  description?: string
  statChanges?: readonly MasteryStatChange[]
  icon?: string
  imageSrc?: string
  reducedMotionSrc?: string
  rarity?: SkillRarity | 'epic'
  level?: number
  maxLevel?: number
  requirements?: string
  evolution?: boolean
  cursed?: boolean
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
/** Taps starting this soon after cards appear were aimed at combat controls, not a card. */
export const CHOICE_ARM_MS = 500
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
