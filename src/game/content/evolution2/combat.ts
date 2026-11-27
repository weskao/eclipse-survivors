import { hallWeaponCast, hallSlow, withHallSource } from '../meta/hall-runtime'
import { combatTargets, hitTarget, slowTarget, targetRadius, type CombatTarget } from '../../combat'
import type { FactionBridge } from '../enemies/integration'
import type { ContentContext } from '../contracts'
import type { GameState } from '../../types'
import { EVOLUTION2_CUES } from './cues'
import type { Evolution2Recipe } from './recipes'

interface Candidate { mob: CombatTarget; distance2: number; order: number }
const MAX_HITS_PER_CAST = 12
const MAX_VOLLEY_PROJECTILES = 80

/** Choose at most 24 nearest living targets. Ties use insertion order. */
function targetsNear(state: GameState, x: number, y: number, range: number, factions?: FactionBridge): CombatTarget[] {
  const results: Candidate[] = []
  const targets = combatTargets(state, factions)
  for (let i = 0; i < targets.length; i++) {
    const mob = targets[i]!
    if (mob.hp <= 0) continue
    const dx = mob.x - x, dy = mob.y - y
    const reach = range + targetRadius(mob)
    const distance2 = dx * dx + dy * dy
    if (distance2 <= reach * reach) results.push({ mob, distance2, order: i })
  }
  results.sort((a, b) => a.distance2 - b.distance2 || a.order - b.order)
  return results.slice(0, 24).map(entry => entry.mob)
}

/**
 * Each activation applies at most twelve unique damage hits and emits a bounded
 * number of ContentVisualFx. The original weapon remains fully active.
 */
export function executeEvolution(context: ContentContext, recipe: Evolution2Recipe): void {
  const { state, hooks } = context
  const factions = hooks.factions?.()
  // The shared registry may be ticked by an integration host outside gameplay.
  if (state.mode !== 'play') {
    state.content.cooldowns[recipe.id] = 0
    return
  }
  const hero = state.hero
  if (!hero) return
  const radiusScale=state.hall?.radius ?? 1
  const nearby = targetsNear(state, hero.x, hero.y, recipe.radius * radiusScale, factions)
  if (!nearby.length) return

  const cue = EVOLUTION2_CUES[recipe.id]!
  const attackHooks=withHallSource(state,hooks,'weapon',true)
  if (recipe.id !== 'evolution2:spectral-volley') hallWeaponCast(state)
  const hitMobs = new Set<CombatTarget>()
  let hitCount = 0
  const damage = (mob: CombatTarget, power: number): number => {
    if (mob.hp <= 0 || hitMobs.has(mob) || hitCount >= MAX_HITS_PER_CAST) return 0
    hitMobs.add(mob)
    hitCount++
    const before = mob.hp
    hitTarget(state, mob, hero.damage * power, attackHooks, factions, hero, 'evolved')
    return before - mob.hp
  }
  const cueAt = (x: number, y: number): void => {
    context.addEffect({ id: cue.effectId, x, y, life: 0.75, max: 0.75 })
  }
  const area = (x: number, y: number, radius: number, power: number, pull = 0): void => {
    // Deterministic nearest-first AoE prevents distant array entries from
    // exhausting a cast's hit budget before enemies at the blast center.
    for (const mob of targetsNear(state, x, y, radius * radiusScale, factions)) {
      if (hitCount >= MAX_HITS_PER_CAST) break
      if (mob.hp <= 0 || hitMobs.has(mob)) continue
      if (pull > 0) {
        const k = ('type' in mob && mob.type === 'boss') ? pull * 0.25 : pull
        mob.x += (x - mob.x) * k
        mob.y += (y - mob.y) * k
      }
      damage(mob, power)
    }
  }

  switch (recipe.id) {
    case 'evolution2:nightfall-torrent': {
      nearby.slice(0, 6).forEach((mob, index) => damage(mob, 1.35 - index * 0.1))
      cueAt(nearby[0]!.x, nearby[0]!.y)
      break
    }
    case 'evolution2:dawn-judgment': {
      const first = nearby[0]!
      const angle = Math.atan2(first.y - hero.y, first.x - hero.x)
      const ux = Math.cos(angle), uy = Math.sin(angle)
      for (const mob of nearby) {
        const dx = mob.x - hero.x, dy = mob.y - hero.y
        const forward = dx * ux + dy * uy
        const lateral = Math.abs(dx * uy - dy * ux)
        if (forward >= 0 && forward <= 430 + targetRadius(mob) && lateral <= 45 + targetRadius(mob)) damage(mob, 1.85)
      }
      hero.inv = Math.max(hero.inv, 0.22)
      cueAt(first.x, first.y)
      break
    }
    case 'evolution2:crimson-reaper': {
      let stolen = 0
      for (const mob of nearby.slice(0, 9)) stolen += damage(mob, 1.5)
      hero.hp = Math.min(hero.max, hero.hp + Math.min(hero.max * 0.08, stolen * 0.13))
      cueAt(hero.x, hero.y)
      break
    }
    case 'evolution2:singularity-minefield': {
      for (const center of nearby.slice(0, 3)) {
        area(center.x, center.y, 105, 1.35, 0.2)
        cueAt(center.x, center.y)
      }
      break
    }
    case 'evolution2:toxic-permafrost': {
      for (const mob of nearby.slice(0, 10)) {
        damage(mob, 0.85)
        slowTarget(mob, hallSlow(state,mob,2.8))
      }
      cueAt(hero.x, hero.y)
      break
    }
    case 'evolution2:infinite-rebound': {
      let current = nearby[0]!
      for (let bounce = 0; bounce < 9; bounce++) {
        damage(current, Math.max(0.5, 1.35 - bounce * 0.1))
        let next: CombatTarget | undefined
        let nearest2 = 200 * 200
        for (const mob of nearby) {
          if (hitMobs.has(mob) || mob.hp <= 0) continue
          const dx = mob.x - current.x, dy = mob.y - current.y
          const distance2 = dx * dx + dy * dy
          if (distance2 < nearest2) { nearest2 = distance2; next = mob }
        }
        if (!next) break
        current = next
      }
      cueAt(current.x, current.y)
      break
    }
    case 'evolution2:wild-hunt': {
      for (const mob of nearby.slice(-3).reverse()) {
        damage(mob, 1.8)
        if ('stagger' in mob) mob.stagger = Math.max(mob.stagger, ('type' in mob && mob.type === 'boss') ? 0.1 : 0.32)
        const dx = mob.x - hero.x, dy = mob.y - hero.y
        const distance = Math.hypot(dx, dy) || 1
        const push = ('type' in mob && mob.type === 'boss') ? 8 : 32
        mob.x += dx / distance * push
        mob.y += dy / distance * push
        cueAt(mob.x, mob.y)
      }
      break
    }
    case 'evolution2:solar-tempest': {
      for (const mob of nearby.slice(0, 5)) {
        damage(mob, 1.6)
        slowTarget(mob, hallSlow(state,mob,0.8))
        cueAt(mob.x, mob.y)
      }
      break
    }
    case 'evolution2:celestial-collapse': {
      for (const center of nearby.slice(0, 2)) {
        area(center.x, center.y, 130, 2.4, 0.28)
        cueAt(center.x, center.y)
      }
      break
    }
    case 'evolution2:spectral-volley': {
      const count = Math.min(5, Math.max(0, MAX_VOLLEY_PROJECTILES - state.shots.length))
      // No phantom cast: an exhausted shared projectile budget cannot spawn arrows.
      if (count === 0) return
      hallWeaponCast(state)
      const first = nearby[0]!
      const base = Math.atan2(first.y - hero.y, first.x - hero.x)
      for (let i = 0; i < count; i++) {
        const angle = base + (i - (count - 1) / 2) * 0.12
        state.shots.push({
          x: hero.x, y: hero.y - 8,
          vx: Math.cos(angle) * 570, vy: Math.sin(angle) * 570,
          life: 1.25, d: hero.damage * 1.05, kind: 'arrow', r: 6,
          ...(state.hall ? {hallWeapon:true} : {}),
        })
      }
      cueAt(hero.x, hero.y)
      break
    }
    case 'evolution2:bonefire-barrage': {
      for (const center of nearby.slice(0, 3)) {
        area(center.x, center.y, 92, 1.6)
        cueAt(center.x, center.y)
      }
      break
    }
    case 'evolution2:verdant-snare': {
      for (const mob of nearby.slice(0, 8)) {
        damage(mob, 0.95)
        slowTarget(mob, hallSlow(state,mob,3.5))
        if ('stagger' in mob) mob.stagger = Math.max(mob.stagger, ('type' in mob && mob.type === 'boss') ? 0.08 : 0.35)
      }
      cueAt(hero.x, hero.y)
      break
    }
    default:
      return
  }
  hooks.sfx(cue.sound)
}
