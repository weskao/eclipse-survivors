import type { Profile, RunStats, CosmeticId } from './types'

export interface Achievement { id: string; icon: string; title: string; hint: string; cosmetic?: CosmeticId }
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-blood', icon: '⚔', title: '初臨戰場', hint: '首次擊倒魔物' },
  { id: 'first-victory', icon: '♛', title: '破曉之光', hint: '獲得第一次勝利', cosmetic: 'knight-gilded' },
  { id: 'monster-hunter', icon: '✦', title: '百魔斬', hint: '單局擊敗 100 隻魔物', cosmetic: 'ranger-moonlit' },
  { id: 'boss-slayer', icon: '☄', title: '魔王終結者', hint: '擊倒魔王', cosmetic: 'wizard-astral' },
  { id: 'survivor', icon: '◈', title: '屹立不搖', hint: '單局存活 300 秒' },
  { id: 'three-heroes', icon: '❖', title: '三英傳說', hint: '使用三名英雄完成冒險' },
]

export function newlyEarned(profile: Profile, run: RunStats): Achievement[] {
  const isEarned = (id: string): boolean => {
    switch (id) {
      case 'first-blood': return profile.runs > 0 && run.kills > 0 || run.kills > 0
      case 'first-victory': return run.victory
      case 'monster-hunter': return run.kills >= 100
      case 'boss-slayer': return run.bossDefeated
      case 'survivor': return run.seconds >= 300
      case 'three-heroes': return profile.heroesPlayed.length === 3
      default: return false
    }
  }
  return ACHIEVEMENTS.filter(a => !profile.achievements.includes(a.id) && isEarned(a.id))
}
