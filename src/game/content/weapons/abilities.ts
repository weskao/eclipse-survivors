import type { ContentAbility, ContentContext } from '../contracts'
import type { Mob, SfxCue, SkillRarity } from '../../types'
import { hit } from '../../combat'
import {
  addMissile, addZone, keepVisual, moveMissiles, nearest, nearestOne, runtimeOf, tickZones,
  type ArsenalRuntime, type MissileKind, type WeaponKey,
} from './runtime'

// Eager, build-time URLs: keep the 3x original illustrations in the existing
// choice-card and HUD rendering path, with no per-frame network lookups.
const productionArt = import.meta.glob('../../../assets/es2/production/weapons/*@3x.webp', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

interface WeaponSpec {
  key: WeaponKey
  icon: string
  title: string
  desc: string
  rarity: SkillRarity
  interval: number
  sound: SfxCue
}
export const WEAPON_SPECS: readonly WeaponSpec[] = [
  { key: 'shadow-daggers', icon: '🗡', title: 'Shadow Daggers', desc: 'Homing knives seek fresh victims after every strike.', rarity: 'common', interval: 1.25, sound: 'ranger' },
  { key: 'holy-lance', icon: '✧', title: 'Holy Lance', desc: 'A long-range blessed spear pierces entire lines.', rarity: 'rare', interval: 2.15, sound: 'bolt' },
  { key: 'blood-scythe', icon: '☽', title: 'Blood Scythe', desc: 'A wide close-range sweep steals a limited amount of life.', rarity: 'rare', interval: 1.6, sound: 'knight' },
  { key: 'arcane-mines', icon: '◈', title: 'Arcane Mines', desc: 'Magical traps detonate after a warning delay.', rarity: 'common', interval: 2.3, sound: 'meteor' },
  { key: 'bone-spears', icon: '⌁', title: 'Bone Spears', desc: 'A timed volley of narrow, penetrating bone darts.', rarity: 'common', interval: 2.05, sound: 'ranger' },
  { key: 'poison-cloud', icon: '☣', title: 'Poison Cloud', desc: 'Lingering toxin zones inflict repeated area damage.', rarity: 'common', interval: 2.65, sound: 'vortex' },
  { key: 'ricochet-blades', icon: '✥', title: 'Ricochet Blades', desc: 'Thrown discs chase different enemies after each bounce.', rarity: 'rare', interval: 1.9, sound: 'chain' },
  { key: 'spirit-wolves', icon: '🐺', title: 'Spirit Wolves', desc: 'Loyal ethereal hunters pursue and bite nearby threats.', rarity: 'rare', interval: 0, sound: 'knight' },
  { key: 'solar-beam', icon: '☀', title: 'Solar Beam', desc: 'Charge up a piercing ray with high single-line damage.', rarity: 'legendary', interval: 3.6, sound: 'bolt' },
  { key: 'gravity-orbs', icon: '◉', title: 'Gravity Orbs', desc: 'Orbiting cores drag enemies in and pulse on contact.', rarity: 'rare', interval: 0, sound: 'vortex' },
  { key: 'spectral-bow', icon: '➶', title: 'Spectral Bow', desc: 'Heavy ghost arrows pierce enemies in a straight line.', rarity: 'rare', interval: 2.6, sound: 'ranger' },
  { key: 'thorn-chain', icon: '❈', title: 'Thorn Chain', desc: 'Bind a cluster of foes with spreading, periodic wounds.', rarity: 'rare', interval: 2.5, sound: 'chain' },
] as const

function ready(r: ArsenalRuntime, key: WeaponKey, dt: number, interval: number, level: number): boolean {
  const left = Math.max(0, (r.timers[key] ?? 0) - dt)
  if (left > 0) { r.timers[key] = left; return false }
  r.timers[key] = Math.max(0.35, interval * (1 - 0.085 * (level - 1)))
  return true
}

function target(context: ContentContext, range: number): Mob | undefined {
  const h = context.state.hero!
  return nearestOne(context.state, h.x, h.y, range)
}

function fireMissile(
  r: ArsenalRuntime, kind: MissileKind,
  x: number, y: number, targetMob: Mob, speed: number, damage: number,
  pierce: number, jumps: number, radius: number,
): void {
  const dx = targetMob.x - x, dy = targetMob.y - y
  const distance = Math.sqrt(dx * dx + dy * dy) || 1
  addMissile(r, {
    kind, x, y, vx: dx / distance * speed, vy: dy / distance * speed,
    life: kind === 'dagger' || kind === 'blade' ? 2.8 : 1.35,
    damage, radius, pierce, jumps, target: targetMob, visited: new Set<Mob>(),
  })
}

function fireStraight(
  context: ContentContext, r: ArsenalRuntime, kind: MissileKind,
  level: number, speed: number, multiplier: number, pierce: number, range: number,
): boolean {
  const h = context.state.hero!
  const e = target(context, range)
  if (!e) return false
  fireMissile(r, kind, h.x, h.y, e, speed,
    h.damage * (multiplier + 0.26 * (level - 1)), pierce, 0,
    kind === 'lance' ? 14 : kind === 'bone' ? 7 : 9)
  return true
}

function slash(context: ContentContext, level: number): boolean {
  const h = context.state.hero!
  const e = target(context, 165 + 9 * level)
  if (!e) return false
  const a = Math.atan2(e.y - h.y, e.x - h.x)
  const ux = Math.cos(a), uy = Math.sin(a)
  let stolen = 0
  for (const mob of context.state.mobs) {
    if (mob.hp <= 0) continue
    const dx = mob.x - h.x, dy = mob.y - h.y
    const reach = 140 + 10 * level + mob.r
    if (dx * dx + dy * dy > reach * reach) continue
    const forward = dx * ux + dy * uy
    if (forward < 0 || forward * forward < (dx * dx + dy * dy) * 0.12) continue
    const damage = h.damage * (0.96 + 0.21 * level)
    stolen += Math.min(mob.hp, damage) * 0.095
    hit(context.state, mob, damage, context.hooks)
  }
  const r = runtimeOf(context.state)
  r.slashLife = 0.3
  r.slashAngle = a
  h.hp = Math.min(h.max, h.hp + Math.min(5 + 1 * level, stolen))
  return true
}

function tickWolves(context: ContentContext, dt: number, level: number): void {
  const h = context.state.hero!, r = runtimeOf(context.state)
  const limit = Math.min(3, 1 + Math.floor(level / 2))
  while (r.wolves.length < limit)
    r.wolves.push({ x: h.x - 22 - r.wolves.length * 14, y: h.y + 22, attackIn: 0 })
  for (const wolf of r.wolves) {
    wolf.attackIn = Math.max(0, wolf.attackIn - dt)
    const enemy = nearestOne(context.state, wolf.x, wolf.y, 490)
    const tx = enemy?.x ?? h.x - 24, ty = enemy?.y ?? h.y + 24
    const dx = tx - wolf.x, dy = ty - wolf.y, d2 = dx * dx + dy * dy
    const attackRange = (enemy?.r ?? 0) + 23
    if (enemy && d2 < attackRange * attackRange) {
      if (wolf.attackIn <= 0) {
        hit(context.state, enemy, h.damage * (0.7 + level * 0.14), context.hooks)
        wolf.attackIn = Math.max(0.52, 1.1 - 0.095 * level)
        context.hooks.sfx('knight')
      }
    } else if (d2 > 4) {
      const distance = Math.sqrt(d2)
      const step = Math.min(distance, (enemy ? 270 : 190) * dt)
      wolf.x += dx / distance * step
      wolf.y += dy / distance * step
    }
  }
}

function tickGravity(context: ContentContext, dt: number, level: number): void {
  const h = context.state.hero!, r = runtimeOf(context.state)
  const n = Math.min(3, 1 + Math.floor(level / 2))
  for (let i = 0; i < n; i++) {
    const a = context.state.worldClock * 2.8 + i * Math.PI * 2 / n
    const ox = h.x + Math.cos(a) * 72, oy = h.y + Math.sin(a) * 72
    for (const e of context.state.mobs) {
      if (e.hp <= 0) continue
      const dx = ox - e.x, dy = oy - e.y
      const reach = 116 + e.r
      const d2 = dx * dx + dy * dy
      if (d2 > reach * reach) continue
      // Smooth attraction without a sqrt; disabled on bosses to preserve boss telegraphs.
      if (e.type !== 'boss') {
        const factor = Math.min(0.19, dt * (0.56 + 0.09 * level))
        e.x += dx * factor
        e.y += dy * factor
      }
      const contact = 18 + e.r
      if (d2 <= contact * contact) {
        const last = r.orbitHits.get(e) ?? -Infinity
        if (context.state.worldClock - last >= 0.32) {
          r.orbitHits.set(e, context.state.worldClock)
          hit(context.state, e, h.damage * (0.35 + 0.1 * level), context.hooks)
        }
      }
    }
  }
}

function tickBeam(context: ContentContext, dt: number, level: number): void {
  const h = context.state.hero!, r = runtimeOf(context.state)
  if (r.beam) {
    r.beam.life -= dt
    if (r.beam.life <= 0) r.beam = null
  }
  if (r.charge > 0) {
    r.charge -= dt
    if (r.charge > 0) return
    // Freeze direction at windup: a moving target cannot silently redirect a telegraphed attack.
    const ux = Math.cos(r.beamAngle), uy = Math.sin(r.beamAngle)
    const range = 690 + 20 * level
    const width = 16 + level * 2.8
    r.beam = { x: h.x, y: h.y, ux, uy, range, width, life: 0.4 }
    for (const mob of context.state.mobs) {
      if (mob.hp <= 0) continue
      const dx = mob.x - h.x, dy = mob.y - h.y
      const along = dx * ux + dy * uy
      if (along < -mob.r || along > range + mob.r) continue
      const side = dx * uy - dy * ux
      const reach = width + mob.r
      if (side * side <= reach * reach)
        hit(context.state, mob, h.damage * (2.75 + 0.63 * level), context.hooks)
    }
    context.hooks.sfx('bolt')
    return
  }
  const next = target(context, 730)
  if (next && ready(r, 'solar-beam', dt, 3.6, level)) {
    r.beamAngle = Math.atan2(next.y - h.y, next.x - h.x)
    r.charge = Math.max(0.42, 0.75 - level * 0.04)
  }
}

function tickChain(context: ContentContext, dt: number, level: number): void {
  const h = context.state.hero!, r = runtimeOf(context.state)
  for (let i = 0; i < r.links.length;) {
    const link = r.links[i]!
    link.life -= dt
    if (link.life <= 0 || link.from.hp <= 0 || link.to.hp <= 0) r.links.splice(i, 1)
    else i++
  }
  r.chainPulse -= dt
  if (r.chainPulse <= 0 && r.links.length) {
    r.chainPulse = 0.42
    const visited = new Set<Mob>()
    for (const link of r.links) {
      if (!visited.has(link.from)) {
        hit(context.state, link.from, h.damage * (0.2 + level * 0.072), context.hooks)
        visited.add(link.from)
      }
      if (!visited.has(link.to)) {
        hit(context.state, link.to, h.damage * (0.18 + level * 0.065), context.hooks)
        visited.add(link.to)
      }
    }
  }
  if (!ready(r, 'thorn-chain', dt, 2.5, level)) return
  const nearby = nearest(context.state, h.x, h.y, 420, Math.min(6, 2 + level))
  if (!nearby.length) return
  const firstDamage = h.damage * (0.45 + 0.145 * level)
  for (const enemy of nearby) hit(context.state, enemy, firstDamage, context.hooks)
  r.links.length = 0
  for (let i = 1; i < nearby.length; i++) {
    const from = nearby[i - 1]!, to = nearby[i]!
    if (from.hp > 0 && to.hp > 0) r.links.push({ from, to, life: 1.75 })
  }
  r.chainPulse = 0.42
  context.hooks.sfx('chain')
}

function tickBoneVolley(context: ContentContext, dt: number, level: number): void {
  const h = context.state.hero!, r = runtimeOf(context.state)
  if (r.volley > 0) {
    r.volleyInterval -= dt
    if (r.volleyInterval <= 0) {
      const enemy = target(context, 620)
      if (enemy) {
        // Spread changes shot direction slightly between pulses, not with per-tick randomness.
        const angle = r.volleyAngle + (r.volley % 2 ? -0.025 : 0.025)
        const dx = Math.cos(angle), dy = Math.sin(angle)
        addMissile(r, {
          kind: 'bone', x: h.x, y: h.y, vx: dx * 690, vy: dy * 690,
          life: 1.3, damage: h.damage * (0.58 + level * 0.18), radius: 7,
          pierce: 2 + Math.floor(level / 3), jumps: 0, visited: new Set<Mob>(),
        })
      }
      r.volley--
      r.volleyInterval = 0.16
    }
  }
  if (r.volley > 0 || !ready(r, 'bone-spears', dt, 2.05, level)) return
  const enemy = target(context, 620)
  if (!enemy) return
  r.volley = Math.min(6, 2 + level)
  r.volleyInterval = 0
  r.volleyAngle = Math.atan2(enemy.y - h.y, enemy.x - h.x)
  context.hooks.sfx('ranger')
}

export function tickWeapon(context: ContentContext, dt: number, level: number, key: WeaponKey): void {
  const h = context.state.hero
  if (!h || context.state.mode !== 'play') return
  const r = runtimeOf(context.state)
  keepVisual(context, r)
  switch (key) {
    case 'shadow-daggers':
      moveMissiles(context, 'dagger', dt)
      if (ready(r, key, dt, 1.25, level)) {
        const enemy = target(context, 510)
        if (enemy) {
          for (let i = 0; i < Math.min(6, 1 + level); i++)
            fireMissile(r, 'dagger', h.x + (i - level / 2) * 12, h.y,
              enemy, 470, h.damage * (0.42 + level * 0.115), 1, 2 + Math.floor(level / 2), 7)
          context.hooks.sfx('ranger')
        }
      }
      break
    case 'holy-lance':
      moveMissiles(context, 'lance', dt)
      if (ready(r, key, dt, 2.15, level) && fireStraight(context, r, 'lance', level, 880, 1.12, 2 + level, 850))
        context.hooks.sfx('bolt')
      break
    case 'blood-scythe':
      r.slashLife = Math.max(0, r.slashLife - dt)
      if (ready(r, key, dt, 1.6, level) && slash(context, level)) context.hooks.sfx('knight')
      break
    case 'arcane-mines':
      tickZones(context, 'mine', dt)
      if (ready(r, key, dt, 2.3, level)) {
        const enemy = target(context, 520)
        if (enemy) {
          const jitter = (context.random() - 0.5) * 24
          addZone(r, { kind: 'mine', x: enemy.x + jitter, y: enemy.y - jitter,
            radius: 80 + 10 * level, damage: h.damage * (1.35 + 0.3 * level),
            life: 1.2, fuse: 0.85, pulse: 0 })
          context.hooks.sfx('meteor')
        }
      }
      break
    case 'bone-spears':
      moveMissiles(context, 'bone', dt)
      tickBoneVolley(context, dt, level)
      break
    case 'poison-cloud':
      tickZones(context, 'poison', dt)
      if (ready(r, key, dt, 2.65, level)) {
        const enemy = target(context, 500)
        if (enemy) {
          addZone(r, { kind: 'poison', x: enemy.x, y: enemy.y,
            radius: 88 + 8 * level, damage: h.damage * (0.13 + level * 0.05),
            life: 3.15, fuse: 0, pulse: 0.17 })
          context.hooks.sfx('vortex')
        }
      }
      break
    case 'ricochet-blades':
      moveMissiles(context, 'blade', dt)
      if (ready(r, key, dt, 1.9, level)) {
        const enemy = target(context, 520)
        if (enemy) {
          fireMissile(r, 'blade', h.x, h.y, enemy, 560,
            h.damage * (0.62 + 0.135 * level), 1, 2 + level, 10)
          context.hooks.sfx('chain')
        }
      }
      break
    case 'spirit-wolves':
      tickWolves(context, dt, level)
      break
    case 'solar-beam':
      tickBeam(context, dt, level)
      break
    case 'gravity-orbs':
      tickGravity(context, dt, level)
      break
    case 'spectral-bow':
      moveMissiles(context, 'arrow', dt)
      if (ready(r, key, dt, 2.6, level) && fireStraight(context, r, 'arrow', level, 640, 1.9, 1 + Math.ceil(level / 2), 720))
        context.hooks.sfx('ranger')
      break
    case 'thorn-chain':
      tickChain(context, dt, level)
      break
  }
}

export const WEAPON_ABILITIES: readonly ContentAbility[] = WEAPON_SPECS.map((spec): ContentAbility => ({
  id: `weapons:${spec.key}` as const,
  kind: 'weapon', icon: spec.icon, iconSrc: productionArt[`../../../assets/es2/production/weapons/${spec.key}@3x.webp`], title: spec.title, desc: spec.desc,
  rarity: spec.rarity, maxLevel: 5,
  // These are continuous-tick weapons: attack cadence lives in the per-run timer.
  // A positive registry cooldown would freeze their active missiles or companions.
  cooldownSeconds: 0,
  onAcquire({ state, hooks }, level) {
    if (level === 1) runtimeOf(state).timers[spec.key] = 0
    hooks.sfx(spec.sound)
  },
  onTick(context, dt, level) { tickWeapon(context, dt, level, spec.key) },
}))
