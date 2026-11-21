import { UP } from '../game/constants'
import type { MobType } from '../game/types'
import type { Profile } from './types'

export const MONSTER_ENTRIES: ReadonlyArray<{ id: MobType; icon: string; label: string; description: string }> = [
  { id: 'slime', icon: '◉', label: '異界史萊姆', description: '接近並包圍旅人的潛伏魔物' },
  { id: 'bat', icon: '✦', label: '幽暮蝙蝠', description: '從暗處快速逼近的飛行魔物' },
  { id: 'goblin', icon: '⚔', label: '荒野哥布林', description: '行動狡詐的小型戰士' },
  { id: 'golem', icon: '⬡', label: '遠古巨像', description: '緩慢但危險的重裝造物' },
  { id: 'warlock', icon: '✶', label: '深淵術士', description: '施放魔法彈幕，與玩家保持距離的遠程魔物' },
  { id: 'boss', icon: '♛', label: '深淵魔王', description: '在遠征中現身的首領' },
]
export function encyclopedia(profile: Profile) {
  return {
    monsters: MONSTER_ENTRIES.map(e => ({ ...e, count: profile.discoveredMonsters[e.id] ?? 0 })),
    abilities: UP.map(e => ({ ...e, discovered: profile.discoveredAbilities.includes(e.id) })),
  }
}
