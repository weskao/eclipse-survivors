// Hits, auto-attack, hero damage and dash (original hit / attack / damageHero / dash).
import { burst, impact, pushEcho, zigzag } from './fx'
import { dist, rand } from './math'
import type { GameHooks, GameState, Hero, Mob } from './types'

/** Living mobs sorted nearest-first (shared by attack, bolt and meteor). */
export const nearestAlive = (mobs: Mob[], hero: Hero): Mob[] =>
  mobs.filter((e) => e.hp > 0).sort((a, b) => dist(a.x - hero.x, a.y - hero.y) - dist(b.x - hero.x, b.y - hero.y))

export function hit(s: GameState, e: Mob, d: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero) return
  const boss = e.type === 'boss'
  e.hp -= d
  e.hit = 0.16
  e.stagger = Math.min(0.18, e.stagger + 0.07)
  const knock = dist(e.x - hero.x, e.y - hero.y) || 1
  e.kx = (e.x - hero.x) / knock
  e.ky = (e.y - hero.y) / knock
  impact(s, e.x, e.y, boss ? 68 : 30, boss ? '#ffab79' : '#ffe6ab', boss ? 1.5 : 0.3)
  s.numberFx.push({ x: e.x + rand(-13, 13), y: e.y - 38, life: 0.62, value: Math.round(d), boss })
  if (s.numberFx.length > 80) s.numberFx.shift()
  burst(s, e.x, e.y, '#fff3c4', 2)
  if (e.hp <= 0) {
    s.kill++
    const value = boss ? 45 : e.type === 'golem' ? 9 : e.type === 'goblin' ? 5 : 3
    s.stars.push({ x: e.x, y: e.y, value, t: rand(0, 6) })
    burst(s, e.x, e.y, boss ? '#ffae83' : '#8cebbf', boss ? 35 : 11)
    hooks.sfx(boss ? 'bossDefeat' : 'kill')
    if (boss) {
      hooks.message('🏆 擊敗森林魔王！')
      impact(s, e.x, e.y, 210, '#ffdca4', 3)
    }
  }
}

export function dash(s: GameState, hooks: GameHooks): void {
  const hero = s.hero
  if (s.mode !== 'play' || !hero || hero.dashCd > 0) return
  hero.dash = 0.22
  hero.dashCd = 3
  hero.inv = Math.max(hero.inv, 0.35)
  burst(s, hero.x, hero.y, '#d8f8ff', 15)
  impact(s, hero.x, hero.y, 55, '#c6f7ff', 0.4)
  pushEcho(s, hero.x, hero.y, s.choice, 0)
  hooks.sfx('dash')
}

export function attack(s: GameState, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero || !s.mobs.length) return
  const choice = s.choice
  const close = nearestAlive(s.mobs, hero)
  const target = close[0]
  if (!target || dist(target.x - hero.x, target.y - hero.y) > hero.range) return
  const multi = Math.min(1 + (hero.skills.multi ?? 0), 4)
  const angle = Math.atan2(target.y - hero.y, target.x - hero.x)
  hero.face = Math.cos(angle) >= 0 ? 1 : -1
  hero.strike = 0.29
  impact(s, hero.x, hero.y, choice === 'knight' ? 56 : 21, choice === 'wizard' ? '#b49cff' : '#f8dba8', 0.35)
  if (choice === 'knight') {
    for (let j = 0; j < multi; j++) {
      const a = angle + (j - (multi - 1) / 2) * 0.43
      s.swipes.push({ x: hero.x, y: hero.y, a, life: 0.29, max: 0.29, r: rand(70, 84) })
      for (const e of close) {
        const r = dist(e.x - hero.x, e.y - hero.y)
        const d = Math.atan2(e.y - hero.y, e.x - hero.x)
        if (r < hero.range && Math.cos(d - a) > 0.71) hit(s, e, hero.damage, hooks)
      }
    }
    hooks.sfx('knight')
  } else {
    const ranger = choice === 'ranger'
    for (let j = 0; j < multi; j++) {
      const a = angle + (j - (multi - 1) / 2) * 0.18
      const speed = ranger ? 540 : 340
      s.shots.push({
        x: hero.x, y: hero.y - 13, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: ranger ? 1.2 : 1.7, d: hero.damage, kind: ranger ? 'arrow' : 'magic', r: ranger ? 5 : 9,
      })
    }
    if (choice === 'wizard') impact(s, hero.x, hero.y, 42, '#aa91ff', 0.45)
    hooks.sfx(ranger ? 'ranger' : 'wizard')
  }
  const chain = hero.skills.chain
  if (chain && hero.chainCd <= 0) {
    hero.chainCd = Math.max(0.5, 2.8 - chain * 0.23)
    const chainTargets = close.slice(0, Math.min(2 + chain, 7))
    for (let i = 0; i < chainTargets.length; i++) {
      const from: Hero | Mob = i ? chainTargets[i - 1]! : hero
      const to = chainTargets[i]!
      zigzag(s, from.x || hero.x, (from.y || hero.y) - 25, to.x, to.y)
      hit(s, to, hero.damage * (0.62 + 0.16 * chain), hooks)
    }
    hooks.sfx('chain')
  }
}

export function damageHero(s: GameState, n: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero || hero.inv > 0 || hero.dash > 0) return
  const shield = hero.skills.shield ?? 0
  const reduce = 1 - Math.min(0.52, shield * 0.12)
  hero.hp -= n * reduce
  hero.inv = 0.8
  s.cameraKick = Math.min(12, s.cameraKick + 4)
  impact(s, hero.x, hero.y, 48, '#ff5b69', 1)
  if (shield) {
    impact(s, hero.x, hero.y, 58, '#9ad3ff', 0.4)
    burst(s, hero.x, hero.y, '#bbdcff', 10)
  }
  burst(s, hero.x, hero.y, '#ff9d9e', 14)
  hooks.sfx('hurt')
  if (hero.hp <= 0) {
    hero.hp = 0
    hooks.end(false)
  }
}
