import { MAX_MOBS } from './constants'
import { damageHero } from './combat'
import { random } from './math'
import { addXp } from './progression'
import type { GameHooks, GameState, WorldEventKind } from './types'
import { clearApproach, hazardPhase, nearbyHazards, pointIsClear, radialPoint } from './world'

const WEIGHTS: readonly [WorldEventKind, number][] = [
  ['chest', 0.27], ['shrine', 0.21], ['invasion', 0.12],
  ['blessing', 0.19], ['bargain', 0.11], ['challenge', 0.10],
]

export function rollEventKind(rng: () => number = random): WorldEventKind {
  const n = rng()
  let cumulative = 0
  for (const [kind, weight] of WEIGHTS) {
    cumulative += weight
    if (n < cumulative) return kind
  }
  return 'challenge'
}

/** Twelve retries, never infinite loops or unreachable/offscreen rewards. */
export function trySpawnEvent(s: GameState, kind: WorldEventKind, rng: () => number = random): boolean {
  const hero = s.hero
  if (!hero || s.events.length >= 2 || (kind === 'bargain' && hero.hp <= 24)) return false
  for (let i = 0; i < 12; i++) {
    const point = radialPoint(hero, rng(), 220 + rng() * Math.min(280, Math.max(190, s.W * 0.55)))
    if (!pointIsClear(s.currentScene, point, 35) || !clearApproach(s.currentScene, hero, point)) continue
    if (s.events.some(e => Math.hypot(e.x - point.x, e.y - point.y) < 120)) continue
    if (s.mobs.some(e => e.hp > 0 && Math.hypot(e.x - point.x, e.y - point.y) < e.r + 42)) continue
    s.events.push({ id: ++s.eventSerial, kind, ...point, expiresAt: s.time + 20 })
    return true
  }
  return false
}

function activateEvent(s: GameState, kind: WorldEventKind, hooks: GameHooks, eventId?: number): boolean {
  const hero = s.hero
  if (!hero) return false
  switch (kind) {
    case 'chest':
      if (eventId !== undefined && hooks.openTreasure?.(s, eventId)) {
        hooks.message('✦ 古代寶箱 · 選擇一件聖物')
      } else {
        addXp(s, 12, hooks)
        hooks.message('✦ 開啟古代寶箱 · 獲得經驗')
      }
      break
    case 'shrine':
      hero.hp = Math.min(hero.max, hero.hp + 36)
      hooks.message('✦ 魔法祭壇 · 回復生命')
      break
    case 'invasion': {
      const count = Math.min(3, MAX_MOBS - s.mobs.length)
      for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / 3
        const x = hero.x + Math.cos(a) * 245
        const y = hero.y + Math.sin(a) * 245
        s.mobs.push({
          x, y, type: 'golem', hp: 250, max: 250, r: 30, speed: 68, dmg: 17,
          phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
        })
      }
      hooks.message('⚠ 菁英入侵 · 遺跡守衛現身')
      break
    }
    case 'blessing':
      s.blessingUntil = s.time + 12
      hooks.message('✦ 暫時祝福 · 持續恢復生命')
      break
    case 'bargain':
      if (hero.hp <= 24) return false
      hero.hp -= 14
      addXp(s, 24, hooks)
      hooks.message('✦ 禁忌契約 · 以生命換取力量')
      break
    case 'challenge':
      s.challengeUntil = s.time + 9
      s.challengePoint = { x: hero.x, y: hero.y }
      hooks.message('⚠ 試煉開始 · 留在法陣內 9 秒')
      break
  }
  hooks.sfx('pickup')
  hooks.content?.(s, { type: 'pickup', kind: 'world' })
  return true
}

/** Events, challenge, blessings and environmental damage all tick only during gameplay. */
export function tickWorld(s: GameState, dt: number, hooks: GameHooks): void {
  const hero = s.hero
  if (!hero || s.mode !== 'play') return
  s.events = s.events.filter(e => e.expiresAt > s.time)
  if (s.time >= s.nextEventAt) {
    s.nextEventAt = s.time + 11 + random() * 5
    if (random() < 0.75) trySpawnEvent(s, rollEventKind())
  }
  for (const event of s.events) {
    if (Math.hypot(event.x - hero.x, event.y - hero.y) > 39) continue
    if (activateEvent(s, event.kind, hooks, event.id)) event.expiresAt = -1
    if (s.mode !== 'play') break
  }
  s.events = s.events.filter(e => e.expiresAt > s.time)
  if (s.blessingUntil > s.time) hero.hp = Math.min(hero.max, hero.hp + 2.4 * dt)

  if (s.challengePoint && s.challengeUntil > 0) {
    const d = Math.hypot(hero.x - s.challengePoint.x, (hero.y - s.challengePoint.y) / 0.58)
    if (d > 250 || hero.hp <= 0) {
      hooks.message('試煉失敗 · 離開法陣')
      s.challengePoint = null
      s.challengeUntil = 0
    } else if (s.time >= s.challengeUntil) {
      addXp(s, 28, hooks)
      hooks.message('✦ 試煉完成 · 經驗獎勵')
      s.challengePoint = null
      s.challengeUntil = 0
    }
  }

  // Scene transitions offer a grace window; one hit cooldown covers overlapping zones.
  if (s.time - s.sceneEnteredAt < 1.2 || s.time - s.hazardLastHitAt < 1.4) return
  const hazards = nearbyHazards(s.currentScene, hero.x, hero.y, 100)
  const contact = hazards.some(h =>
    Math.hypot(hero.x - h.x, (hero.y - h.y) / 0.58) < h.r + 4 &&
    hazardPhase(s.currentScene, h, s.worldClock) === 'active'
  )
  const challengeRing = !!s.challengePoint && s.challengeUntil > s.time &&
    Math.abs(Math.hypot(hero.x - s.challengePoint.x, (hero.y - s.challengePoint.y) / 0.58) - 130) < 18 &&
    s.time % 3 > 2.15
  if (!contact && !challengeRing) return
  if (hero.inv > 0 || hero.dash > 0) return
  damageHero(s, 7 + s.currentScene * 2, hooks)
  s.hazardLastHitAt = s.time
}
