import { emptyHud, type HudView } from '../../../game/store'
import type { CombatHudFeed } from './model'

/** Visual-test/demo ONLY. No production code imports these fixtures. */
export const demoHud: HudView = {
  ...emptyHud(),
  who: '虛空法師 · LV.18',
  hpPct: 72,
  hpLabel: '生命 216 / 300',
  xpPct: 64,
  kill: 842,
  timer: '17:23',
  bossPct: 58,
  quest: '破壞黑暗祭壇 2 / 3',
  skills: [
    { id: 'meteor', icon: '☄', title: '流星', rarity: 'rare', level: 4, maxLevel: 5, cooldown: 1.5, cooldownPct: 33, evolved: false },
    { id: 'vortex', icon: '◉', title: '漩渦', rarity: 'legendary', level: 2, maxLevel: 5, cooldown: 0, cooldownPct: 0, evolved: false },
    { id: 'shield', icon: '⛨', title: '護盾', rarity: 'common', level: 3, maxLevel: 5, cooldown: 2.1, cooldownPct: 70, evolved: false },
  ],
}

export const demoFeed: CombatHudFeed = {
  boss: { name: '深淵君主', phase: 2, totalPhases: 3 },
  wave: { number: 14, announcement: '血月降臨' },
  combo: { count: 21 },
  relics: [{ id: 'demo:relic', title: '月蝕聖印', icon: '✹', rarity: 'legendary' }],
  statuses: [
    { id: 'demo:buff', title: '聖光庇佑', kind: 'buff', remainingSeconds: 9.8 },
    { id: 'demo:debuff', title: '詛咒', kind: 'debuff', remainingSeconds: 3.4 },
  ],
  objectives: [{ id: 'demo:altar', title: '破壞黑暗祭壇', progress: 2, target: 3 }],
  notices: [{ id: 'demo:crit', kind: 'critical', text: '暴擊 1,284' }, { id: 'demo:loot', kind: 'treasure', text: '傳說寶箱已獲得' }],
}
