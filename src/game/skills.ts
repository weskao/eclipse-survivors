// Passive skills ticked every frame (original update() lines for orb..shield).
import { BALANCE } from './config'
import { hallPersistentCast, hallSlow, hallWeaponCast, withHallSource } from './content/meta/hall-runtime'
import { TAU } from './constants'
import { combatTargets, hitTarget, nearestCombatTargets, slowTarget, targetRadius } from './combat'
import type { FactionBridge } from './content/enemies/integration'
import { impact, pushParticle, zigzag } from './fx'
import { tickEvolutions } from './evolutions'
import { rand, random } from './math'
import type { GameHooks, GameState } from './types'

const AREA = BALANCE.skills.area

const EMBER_COLORS = ['#ffd29f', '#ffa847', '#ff7c41']

export function tickSkills(s: GameState, dt: number, hooks: GameHooks, factions?: FactionBridge): void {
  const hero = s.hero
  if (!hero) return
  const sk = hero.skills
  const weaponHooks = withHallSource(s, hooks, 'weapon')
  const persistentHooks = withHallSource(s, hooks, 'persistent', true)
  const areaHooks = withHallSource(s,hooks,'weapon',true)
  const radius = s.hall?.radius ?? 1
  const cooldown = s.hall?.weaponCooldown ?? 1
  const targets = sk.orb || sk.bolt || sk.frost || sk.meteor || sk.blaze || sk.vortex ? combatTargets(s, factions) : s.mobs

  if (sk.orb) {
    hallPersistentCast(s,'orb')
    const n = Math.min(sk.orb + 1 + (sk.orb >= 5 ? AREA.orb.maxRankBonusBlades : 0) + (hero.evolutions['blade-tempest'] ? 2 : 0), AREA.orb.maxBlades)
    for (let k = 0; k < n; k++) {
      const a = s.worldClock * 2.7 + (k * TAU) / n
      const ox = hero.x + Math.cos(a) * 71
      const oy = hero.y + Math.sin(a) * 71
      for (const e of targets) {
        const dx = e.x - ox, dy = e.y - oy, reach = targetRadius(e) + 11
        if (e.hp > 0 && ('radius' in e ? (e.orbCooldown ?? 0) : e.hit) <= 0 && dx * dx + dy * dy < reach * reach) {
          if (hitTarget(s, e, AREA.orb.baseDamage + hero.damage * AREA.orb.heroDamageRatio, persistentHooks, factions)) {
            if ('radius' in e) e.orbCooldown = AREA.orb.hitCooldown
            else e.hit = AREA.orb.hitCooldown
          }
        }
      }
    }
  }

  if (sk.bolt && hero.bolt <= 0) {
    hero.bolt = Math.max(AREA.bolt.cooldownFloor, AREA.bolt.cooldownBase - sk.bolt * AREA.bolt.cooldownPerRank) * cooldown
    let castCounted=false
    for (const e of nearestCombatTargets(targets, hero).slice(0, Math.min(AREA.bolt.targetBase + sk.bolt, AREA.bolt.maxTargets))) {
      const dx = e.x - hero.x, dy = e.y - hero.y
      if (dx * dx + dy * dy < AREA.bolt.range * AREA.bolt.range) {
        if(!castCounted){hallWeaponCast(s);castCounted=true}
        if (!hitTarget(s, e, hero.damage * AREA.bolt.damageRatio, weaponHooks, factions, hero, 'elemental')) continue
        if (sk.bolt >= 5) slowTarget(e, hallSlow(s, e, AREA.bolt.maxRankShockSeconds))
        zigzag(s, e.x + rand(-28, 28), e.y - 160, e.x, e.y)
        impact(s, e.x, e.y, 52, '#bdf4ff', 0.5)
        pushParticle(s, { x: e.x, y: e.y - 75, vx: 0, vy: 140, life: 0.26, max: 0.26, color: '#bbf5ff', r: 11, type: 'spark' })
      }
    }
    hooks.sfx('bolt')
  }

  if (sk.frost && hero.frostCd <= 0) {
    hero.frostCd = Math.max(AREA.frost.cooldownFloor, AREA.frost.cooldownBase - sk.frost * AREA.frost.cooldownPerRank) * cooldown
    hallWeaponCast(s)
    impact(s, hero.x, hero.y, 120 + sk.frost * 12 + (sk.frost >= 5 ? AREA.frost.maxRankRangeBonus : 0), '#bcefff', 1)
    for (let i = 0; i < 20; i++) {
      pushParticle(s, {
        x: hero.x + rand(-18, 18), y: hero.y + rand(-18, 12), vx: rand(-110, 110), vy: rand(-150, 10),
        life: 0.7, max: 0.7, color: '#d8f7ff', r: 2 + random() * 5, type: 'ice',
      })
    }
    const reach = (AREA.frost.rangeBase + sk.frost * AREA.frost.rangePerRank + (sk.frost >= 5 ? AREA.frost.maxRankRangeBonus : 0)) * radius
    for (const e of targets) {
      const dx = e.x - hero.x, dy = e.y - hero.y
      if (dx * dx + dy * dy < reach * reach) {
        if (hitTarget(s, e, hero.damage * (AREA.frost.damageBase + AREA.frost.damagePerRank * sk.frost), areaHooks, factions, hero, 'elemental')) slowTarget(e, hallSlow(s, e, AREA.frost.slowBase + AREA.frost.slowPerRank * sk.frost))
      }
    }
    hooks.sfx('frost')
  }

  if (sk.meteor && hero.meteorCd <= 0) {
    hero.meteorCd = Math.max(AREA.meteor.cooldownFloor, AREA.meteor.cooldownBase - sk.meteor * AREA.meteor.cooldownPerRank) * cooldown
    if(targets.some(e=>e.hp>0))hallWeaponCast(s)
    for (const e of nearestCombatTargets(targets, hero).slice(0, Math.min(AREA.meteor.targetBase + sk.meteor, AREA.meteor.maxTargets))) {
      pushParticle(s, { x: e.x, y: e.y, life: 0.8, max: 0.8, color: '#ffba7c', r: 18, type: 'meteor' })
      impact(s, e.x, e.y, 84 + (sk.meteor >= 5 ? AREA.meteor.maxRankRangeBonus : 0), '#ffb26b', 1.1)
      const reach = (AREA.meteor.rangeBase + sk.meteor * AREA.meteor.rangePerRank + (sk.meteor >= 5 ? AREA.meteor.maxRankRangeBonus : 0)) * radius
      for (const m of targets) {
        const dx = m.x - e.x, dy = m.y - e.y
        if (m.hp > 0 && dx * dx + dy * dy < reach * reach) hitTarget(s, m, hero.damage * (AREA.meteor.damageBase + AREA.meteor.damagePerRank * sk.meteor), areaHooks, factions, e, 'elemental')
      }
    }
    hooks.sfx('meteor')
  }

  if (sk.blaze) {
    hallPersistentCast(s,'blaze')
    if (hero.blazeTick <= 0) {
      hero.blazeTick = Math.max(AREA.blaze.cooldownFloor, AREA.blaze.cooldownBase - sk.blaze * AREA.blaze.cooldownPerRank) * cooldown
      const reach = (AREA.blaze.rangeBase + sk.blaze * AREA.blaze.rangePerRank + (sk.blaze >= 5 ? AREA.blaze.maxRankRangeBonus : 0)) * radius
      for (const e of targets) {
        const dx = e.x - hero.x, dy = e.y - hero.y
        if (dx * dx + dy * dy < reach * reach) hitTarget(s, e, hero.damage * (AREA.blaze.damageBase + AREA.blaze.damagePerRank * sk.blaze), persistentHooks, factions, hero, 'elemental')
      }
    }
    if (random() < dt * 10) {
      pushParticle(s, {
        x: hero.x + rand(-42, 42), y: hero.y + rand(-25, 18), vx: rand(-20, 20), vy: rand(-120, -20),
        life: 0.55, max: 0.55, color: EMBER_COLORS[Math.floor(random() * 3)] ?? '#ffd29f', r: 3 + random() * 4, type: 'ember',
      })
    }
  }

  if (sk.vortex && hero.vortexCd <= 0) {
    hero.vortexCd = Math.max(AREA.vortex.cooldownFloor, AREA.vortex.cooldownBase - sk.vortex * AREA.vortex.cooldownPerRank) * cooldown
    hallWeaponCast(s)
    impact(s, hero.x, hero.y, 145 + (sk.vortex >= 5 ? AREA.vortex.maxRankRangeBonus : 0), '#cbaeff', 1.4)
    for (let i = 0; i < 36; i++) {
      pushParticle(s, {
        x: hero.x + Math.cos((i / 36) * TAU) * 90, y: hero.y + Math.sin((i / 36) * TAU) * 90, vx: 0, vy: 0,
        life: 0.8, max: 0.8, color: '#baa1ff', r: 2 + random() * 4, type: 'vortex', a: (i / 36) * TAU,
      })
    }
    const reach = (AREA.vortex.rangeBase + sk.vortex * AREA.vortex.rangePerRank + (sk.vortex >= 5 ? AREA.vortex.maxRankRangeBonus : 0)) * radius
    for (const e of targets) {
      const dx = e.x - hero.x, dy = e.y - hero.y
      const squared = dx * dx + dy * dy
      if (squared < reach * reach) {
        const pull = Math.max(0, 1 - Math.sqrt(squared) / reach)
        e.x += (hero.x - e.x) * AREA.vortex.pullRatio * pull
        e.y += (hero.y - e.y) * AREA.vortex.pullRatio * pull
        hitTarget(s, e, hero.damage * (AREA.vortex.damageBase + AREA.vortex.damagePerRank * sk.vortex), areaHooks, factions, hero, 'elemental')
      }
    }
    hooks.sfx('vortex')
  }

  if (sk.shield && hero.shieldPulse <= 0) {
    hero.shieldPulse = Math.max(AREA.shield.pulseFloor, AREA.shield.pulseBase - sk.shield * AREA.shield.pulsePerRank)
    impact(s, hero.x, hero.y, 66, '#9ad3ff', 0.25)
  }
  tickEvolutions(s, hooks, factions)
}
