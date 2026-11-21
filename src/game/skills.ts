// Passive skills ticked every frame (original update() lines for orb..shield).
import { TAU } from './constants'
import { hit, nearestAlive } from './combat'
import { impact, zigzag } from './fx'
import { tickEvolutions } from './evolutions'
import { dist, rand, random } from './math'
import type { GameHooks, GameState } from './types'

const EMBER_COLORS = ['#ffd29f', '#ffa847', '#ff7c41']

export function tickSkills(s: GameState, dt: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero) return
  const sk = hero.skills

  if (sk.orb) {
    const n = Math.min(sk.orb + 1, 6)
    for (let k = 0; k < n; k++) {
      const a = s.worldClock * 2.7 + (k * TAU) / n
      const ox = hero.x + Math.cos(a) * 71
      const oy = hero.y + Math.sin(a) * 71
      for (const e of s.mobs) {
        if (e.hp > 0 && dist(e.x - ox, e.y - oy) < e.r + 11 && e.hit <= 0) {
          hit(s, e, 10 + hero.damage * 0.25, hooks)
          e.hit = 0.28
        }
      }
    }
  }

  if (sk.bolt && hero.bolt <= 0) {
    hero.bolt = Math.max(0.45, 2 - sk.bolt * 0.16)
    for (const e of nearestAlive(s.mobs, hero).slice(0, Math.min(2 + sk.bolt, 6))) {
      if (dist(e.x - hero.x, e.y - hero.y) < 450) {
        hit(s, e, hero.damage * 1.3, hooks)
        zigzag(s, e.x + rand(-28, 28), e.y - 160, e.x, e.y)
        impact(s, e.x, e.y, 52, '#bdf4ff', 0.5)
        s.fx.push({ x: e.x, y: e.y - 75, vx: 0, vy: 140, life: 0.26, max: 0.26, color: '#bbf5ff', r: 11, type: 'spark' })
      }
    }
    hooks.sfx('bolt')
  }

  if (sk.frost && hero.frostCd <= 0) {
    hero.frostCd = Math.max(1.2, 5.4 - sk.frost * 0.45)
    impact(s, hero.x, hero.y, 120 + sk.frost * 12, '#bcefff', 1)
    for (let i = 0; i < 20; i++) {
      s.fx.push({
        x: hero.x + rand(-18, 18), y: hero.y + rand(-18, 12), vx: rand(-110, 110), vy: rand(-150, 10),
        life: 0.7, max: 0.7, color: '#d8f7ff', r: 2 + random() * 5, type: 'ice',
      })
    }
    for (const e of s.mobs) {
      const d = dist(e.x - hero.x, e.y - hero.y)
      if (d < 170 + sk.frost * 14) {
        hit(s, e, hero.damage * (0.55 + 0.12 * sk.frost), hooks)
        e.slow = 0.9 + 0.16 * sk.frost
      }
    }
    hooks.sfx('frost')
  }

  if (sk.meteor && hero.meteorCd <= 0) {
    hero.meteorCd = Math.max(1.8, 6.0 - sk.meteor * 0.42)
    for (const e of nearestAlive(s.mobs, hero).slice(0, Math.min(1 + sk.meteor, 5))) {
      s.fx.push({ x: e.x, y: e.y, life: 0.8, max: 0.8, color: '#ffba7c', r: 18, type: 'meteor' })
      impact(s, e.x, e.y, 84, '#ffb26b', 1.1)
      for (const m of s.mobs) {
        if (m.hp > 0 && dist(m.x - e.x, m.y - e.y) < 110 + sk.meteor * 8) hit(s, m, hero.damage * (1.15 + 0.18 * sk.meteor), hooks)
      }
    }
    hooks.sfx('meteor')
  }

  if (sk.blaze) {
    if (hero.blazeTick <= 0) {
      hero.blazeTick = Math.max(0.18, 0.48 - sk.blaze * 0.03)
      for (const e of s.mobs) {
        const d = dist(e.x - hero.x, e.y - hero.y)
        if (d < 95 + sk.blaze * 14) hit(s, e, hero.damage * (0.18 + 0.04 * sk.blaze), hooks)
      }
    }
    if (random() < dt * 10) {
      s.fx.push({
        x: hero.x + rand(-42, 42), y: hero.y + rand(-25, 18), vx: rand(-20, 20), vy: rand(-120, -20),
        life: 0.55, max: 0.55, color: EMBER_COLORS[Math.floor(random() * 3)] ?? '#ffd29f', r: 3 + random() * 4, type: 'ember',
      })
    }
  }

  if (sk.vortex && hero.vortexCd <= 0) {
    hero.vortexCd = Math.max(2.2, 8 - sk.vortex * 0.55)
    impact(s, hero.x, hero.y, 145, '#cbaeff', 1.4)
    for (let i = 0; i < 36; i++) {
      s.fx.push({
        x: hero.x + Math.cos((i / 36) * TAU) * 90, y: hero.y + Math.sin((i / 36) * TAU) * 90, vx: 0, vy: 0,
        life: 0.8, max: 0.8, color: '#baa1ff', r: 2 + random() * 4, type: 'vortex', a: (i / 36) * TAU,
      })
    }
    const reach = 220 + sk.vortex * 12
    for (const e of s.mobs) {
      const d = dist(e.x - hero.x, e.y - hero.y)
      if (d < reach) {
        const pull = Math.max(0, 1 - d / reach)
        e.x += (hero.x - e.x) * 0.18 * pull
        e.y += (hero.y - e.y) * 0.18 * pull
        hit(s, e, hero.damage * (0.4 + 0.08 * sk.vortex), hooks)
      }
    }
    hooks.sfx('vortex')
  }

  if (sk.shield && hero.shieldPulse <= 0) {
    hero.shieldPulse = Math.max(0.4, 2.8 - sk.shield * 0.18)
    impact(s, hero.x, hero.y, 66, '#9ad3ff', 0.25)
  }
  tickEvolutions(s, hooks)
}
