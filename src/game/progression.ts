// XP, level-ups and upgrade effects (original addXp / chooseUpgrade item pick / applyUpgrade stat part).
import { UP } from './constants'
import { burst, impact } from './fx'
import { random } from './math'
import type { GameHooks, GameState, UpgradeDef, UpgradeId } from './types'

export function addXp(s: GameState, n: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero) return
  hero.xp += n
  while (hero.xp >= hero.need) {
    hero.xp -= hero.need
    hero.level++
    hero.need = Math.round(hero.need * 1.28 + 7)
    s.levelQueue++
    hero.levelAnim = 1.1
    impact(s, hero.x, hero.y, 88, '#ffe1a8', 1.8)
    burst(s, hero.x, hero.y, '#fff0ba', 20)
    hooks.message(`✨ 等級提升！ Lv.${hero.level}`)
  }
  if (s.levelQueue && s.mode === 'play') hooks.offerUpgrades()
}

export const pickUpgrades = (): UpgradeDef[] => [...UP].sort(() => random() - 0.5).slice(0, 3)

const MESSAGES: Partial<Record<UpgradeId, string>> = {
  magnet: '水晶磁力增強！',
  meteor: '殞星之力覺醒！',
  vortex: '虛空渦流更強大了！',
  blaze: '焚天烈環開始燃燒！',
  frost: '極寒新星冰封敵人！',
  chain: '連鎖雷擊激活！',
}

/** Stat effects only; the caller switches screens, re-offers, plays 'upgrade' and refreshes the HUD. */
export function applyUpgrade(s: GameState, id: UpgradeId, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero) return
  hero.skills[id] = (hero.skills[id] ?? 0) + 1
  if (id === 'damage') hero.damage *= 1.25
  if (id === 'speed') hero.speed *= 1.12
  if (id === 'haste') hero.delay *= 0.85
  if (id === 'maxhp') {
    hero.max += 35
    hero.hp = Math.min(hero.max, hero.hp + 55)
  }
  if (id === 'shield') hero.hp = Math.min(hero.max, hero.hp + 25)
  const msg = MESSAGES[id]
  if (msg) hooks.message(msg)
  s.levelQueue--
  hero.levelAnim = Math.max(hero.levelAnim, 0.8)
}
