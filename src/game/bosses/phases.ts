import { MAX_MOBS } from '../constants'
import { dist } from '../math'
import type { GameHooks, GameState, Mob } from '../types'

/** Health thresholds are crossed once; a phase change cancels a pending attack. */
export function updateBossPhase(_s: GameState, boss: Mob, hooks: GameHooks): 1 | 2 | 3 {
  const phase: 1 | 2 | 3 = boss.hp / Math.max(1, boss.max) <= 1 / 3 ? 3
    : boss.hp / Math.max(1, boss.max) <= 2 / 3 ? 2 : 1
  const previous = boss.bossPhase ?? 1
  if (phase > previous && boss.hp > 0) {
    boss.ai = {
      state: 'recover', timer: 1.2, attack: 'slam', aimX: boss.x, aimY: boss.y,
      dirX: 0, dirY: 0, cycle: 0,
    }
    hooks.message(phase === 2 ? '⚠ 魔王第二階段：召喚與地裂！' : '🔥 魔王第三階段：狂怒！')
  }
  boss.bossPhase = phase
  return phase
}

/** Only six living summoned minions at a time, with deterministic safe placement. */
export function summonBossMinions(s: GameState, boss: Mob): void {
  if (!s.hero || boss.hp <= 0 || boss.type !== 'boss') return
  const living = s.mobs.filter(m => m.summonedByBoss && m.hp > 0).length
  const count = Math.min(2, 6 - living, MAX_MOBS - s.mobs.length)
  for (let i = 0; i < count; i++) {
    const angle = (living + i) * 2.399963229728653
    let x = boss.x + Math.cos(angle) * 145
    let y = boss.y + Math.sin(angle) * 145
    const hero = s.hero
    const dx = x - hero.x, dy = y - hero.y
    const d = dist(dx, dy)
    if (d < 135) {
      const safe = Math.max(1, d)
      x = hero.x + (d ? dx / safe : 1) * 135
      y = hero.y + (d ? dy / safe : 0) * 135
    }
    s.mobs.push({
      x, y, type: 'goblin', hp: 55, max: 55, r: 20, speed: 75, dmg: 11,
      phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, summonedByBoss: true,
    })
  }
}
