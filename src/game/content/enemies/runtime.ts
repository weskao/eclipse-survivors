import { BALANCE } from '../../config'
import { ENEMY_DEFINITIONS, type FactionAffix, type FactionKind } from './definitions'

export const MAX_FACTION_ENEMIES = 130
export const MAX_FACTION_PROJECTILES = 100
export const MAX_FACTION_ZONES = 64

export type FactionAiState = 'approach' | 'phase' | 'windup' | 'attack' | 'recover'
export type FactionStatus = 'poison' | 'freeze' | 'burn' | undefined

export interface FactionEnemy {
  id: number
  kind: FactionKind
  x: number
  y: number
  hp: number
  max: number
  radius: number
  speed: number
  damage: number
  affix?: FactionAffix
  summonedBy?: number
  rewardXpMultiplier?: number
  summonsMade: number
  state: FactionAiState
  timer: number
  phaseCooldown: number
  cycle: number
  aimX: number
  aimY: number
  facingX: number
  facingY: number
  hitThisAttack: boolean
  /** Pure presentation: never changes position, range or the FSM. */
  hitTime?: number
  hitX?: number
  hitY?: number
  knockRemaining?: number
  releaseFx?: number
  visualHold?: number
  visualFrame?: number
  lastVisualHoldAt?: number
  deathVisual?: number
  deathVisualTotal?: number
  slow?: number
  orbCooldown?: number
}

export interface FactionProjectile {
  x: number; y: number; vx: number; vy: number
  radius: number; damage: number; life: number
  sourceId: number; kind: FactionKind; status: FactionStatus
  attackRank?: 'ordinary' | 'elite'
}

export interface FactionZone {
  x: number; y: number; radius: number
  damage: number; life: number; delay: number; interval: number; tick: number
  status: FactionStatus; sourceId: number; kind: FactionKind
}

export interface FactionRuntime {
  enemies: FactionEnemy[]
  fallen: FactionEnemy[]
  projectiles: FactionProjectile[]
  zones: FactionZone[]
  nextId: number
  /** Set from GameState.mobs.length when the legacy and faction simulations coexist. */
  legacyMobCount: number
}

export interface FactionHit {
  contact?: boolean
  kind: FactionKind
  sourceId: number
  attackRank?: 'ordinary' | 'elite'
  angle?: number
  status?: Exclude<FactionStatus, undefined>
  duration?: number
}

export interface FactionReward {
  kind: FactionKind
  x: number
  y: number
  xp: number
  elite: boolean
}

export interface FactionArena {
  runtime: FactionRuntime
  hero: { x: number; y: number }
  width: number
  height: number
  /** Integrator supplies the current live legacy population for a shared 130-mob cap. */
  legacyMobCount?: number
  /** Required by the integrating game when walls can obstruct an attack. */
  lineOfSight?(fromX: number, fromY: number, toX: number, toY: number): boolean
  /** Return true only if damage actually landed (not dashing, shielded or invulnerable). */
  onHeroDamage(damage: number, hit: FactionHit): boolean
  /** Optional cue for telegraphs; renderers may also inspect state, aim and zones directly. */
  onTelegraph?(enemy: FactionEnemy): void
}

export function createFactionRuntime(): FactionRuntime {
  return { enemies: [], fallen: [], projectiles: [], zones: [], nextId: 1, legacyMobCount: 0 }
}

/** Spawn is explicit: ContentPack registration never calls this function. */
export function spawnFactionEnemy(
  runtime: FactionRuntime,
  kind: FactionKind,
  x: number,
  y: number,
  options: { affix?: FactionAffix; summonedBy?: number; rewardXpMultiplier?:number } = {},
): FactionEnemy | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || runtime.enemies.length + runtime.legacyMobCount >= MAX_FACTION_ENEMIES) return null
  const def = ENEMY_DEFINITIONS[kind]
  if (!def) return null
  const elite = !!options.affix
  const max = Math.round(def.hp * (elite ? 1.7 : 1))
  const enemy: FactionEnemy = {
    id: runtime.nextId++, kind, x, y, hp: max, max,
    radius: def.radius, speed: def.speed, damage: Math.round(def.damage * (elite ? 1.2 : 1)),
    affix: options.affix, summonedBy: options.summonedBy, rewardXpMultiplier:options.rewardXpMultiplier,
    summonsMade: 0, state: 'approach', timer: 0, phaseCooldown: 0, cycle: 0,
    aimX: x, aimY: y, facingX: -1, facingY: 0, hitThisAttack: false,
  }
  runtime.enemies.push(enemy)
  return enemy
}

const squared = (dx: number, dy: number): number => dx * dx + dy * dy
const distanceToSegmentSquared = (
  px: number, py: number, x: number, y: number, dx: number, dy: number,
): number => {
  const t = Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / Math.max(0.00001, squared(dx, dy))))
  return squared(px - x - dx * t, py - y - dy * t)
}

function visibleToHero(a: FactionArena, e: FactionEnemy): boolean {
  // An enemy outside the hero-centered viewport cannot secretly begin an attack.
  // Leave a small culling margin so large actors remain visible at the edge.
  return Math.abs(a.hero.x - e.x) <= Math.max(0, a.width) * 0.5 + 40
    && Math.abs(a.hero.y - e.y) <= Math.max(0, a.height) * 0.5 + 40
}

function hasSight(a: FactionArena, e: FactionEnemy): boolean {
  return !a.lineOfSight || a.lineOfSight(e.x, e.y, a.hero.x, a.hero.y)
}

function hitHero(a: FactionArena, e: FactionEnemy, damage = e.damage, status?: Exclude<FactionStatus, undefined>): void {
  const landed = a.onHeroDamage(damage, {
    kind: e.kind, sourceId: e.id, attackRank: e.affix ? 'elite' : 'ordinary', contact:true,
    angle: Math.atan2(a.hero.y - e.y, a.hero.x - e.x), ...(status ? { status, duration: status === 'freeze' ? 1.2 : 2 } : {}),
  })
  if (landed && e.affix === 'vampiric') e.hp = Math.min(e.max, e.hp + damage * 0.35)
}

function addZone(
  r: FactionRuntime, e: FactionEnemy, x: number, y: number, radius: number,
  damage: number, status: FactionStatus, delay = 0.3, life = 2,
): void {
  if (r.zones.length >= MAX_FACTION_ZONES) return
  r.zones.push({ x, y, radius, damage, life, delay, interval: 0.65, tick: 0,
    status, sourceId: e.id, kind: e.kind })
}

function addProjectile(
  r: FactionRuntime, e: FactionEnemy, spread: number, speed: number,
  status: FactionStatus,
): void {
  if (r.projectiles.length >= MAX_FACTION_PROJECTILES) return
  const dx = e.aimX - e.x, dy = e.aimY - e.y
  const angle = Math.atan2(dy, dx) + spread
  r.projectiles.push({
    x: e.x, y: e.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    radius: 7, damage: e.damage, life: 2.8, sourceId: e.id, kind: e.kind, status,
    attackRank: e.affix ? 'elite' : 'ordinary',
  })
}

/** Shared pose selection for the renderer and hit-stop snapshot. */
export function factionPoseFrame(e: FactionEnemy, clock: number): number {
  return e.state === 'phase' ? 5 : e.state === 'windup' ? 2 : e.state === 'attack' ? 3
    : e.state === 'recover' ? ((e.releaseFx ?? 0) > .16 ? 3 : 4) : (Math.floor(clock * 6 + e.id) & 1)
}

/** Damage accounting lives here, not in legacy hit(); reward ownership stays with integration. */
export function damageFactionEnemy(
  runtime: FactionRuntime,
  e: FactionEnemy,
  damage: number,
  sourceX: number,
  sourceY: number,
  onReward?: (reward: FactionReward) => void,
): number {
  if (e.hp <= 0 || e.state === 'phase' || !Number.isFinite(damage) || damage <= 0) return 0
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) return 0
  let multiplier = e.affix === 'armored' ? 0.65 : 1
  if (e.kind === 'shield-guardian') {
    const dx = sourceX - e.x, dy = sourceY - e.y
    const length = Math.sqrt(squared(dx, dy))
    if (length > 0 && (dx * e.facingX + dy * e.facingY) / length > 0.35) multiplier *= 0.3
  }
  const actual = Math.min(e.hp, damage * multiplier)
  e.hp = Math.max(0, e.hp - actual)
  const dx = e.x - sourceX, dy = e.y - sourceY
  const distance = Math.hypot(dx, dy)
  e.hitTime = 0.24
  e.hitX = distance > 0.001 ? dx / distance : 0
  e.hitY = distance > 0.001 ? dy / distance : 0
  if (e.hp > 0 && (e.state === 'approach' || e.state === 'recover')) e.knockRemaining = .10
  if (e.hp === 0) {
    e.deathVisual = e.deathVisualTotal = e.affix ? .46 : e.radius >= 24 ? .36 : .28
    const def = ENEMY_DEFINITIONS[e.kind]
    onReward?.({ kind: e.kind, x: e.x, y: e.y,
      xp: Math.round(def.xp * (e.affix ? 1.7 : 1) * (e.rewardXpMultiplier ?? 1)), elite: !!e.affix })
    if (e.affix === 'explosive') addZone(runtime, e, e.x, e.y, 75, e.damage, 'burn', 0.45, 0.8)
    if (e.affix === 'frozen') addZone(runtime, e, e.x, e.y, 75, e.damage * 0.4, 'freeze', 0.4, 1.3)
  }
  return actual
}

function move(e: FactionEnemy, hero: FactionArena['hero'], dt: number): void {
  const dx = hero.x - e.x, dy = hero.y - e.y
  const length = Math.max(0.001, Math.sqrt(squared(dx, dy)))
  const dirX = dx / length, dirY = dy / length
  e.facingX = dirX; e.facingY = dirY
  const kind = e.kind
  const rage = kind === 'berserker' && e.hp <= e.max * 0.5 ? 1.75 : 1
  const swift = e.affix === 'swift' ? 1.45 : 1
  const step = Math.min(length, e.speed * rage * swift * ((e.slow ?? 0) > 0 ? BALANCE.enemies.ai.slowedSpeedMultiplier : 1) * dt)
  let toward = 1, strafe = 0
  if (kind === 'shadow-assassin') { toward = 0.6; strafe = e.cycle % 2 ? -1.05 : 1.05 }
  if (kind === 'dark-archer') { toward = length < 170 ? -0.7 : length > 290 ? 0.75 : 0; strafe = 0.6 }
  if (kind === 'necromancer') toward = length < 150 ? -0.65 : 0.65
  if (kind === 'frost-wraith') toward = length < 160 ? -0.5 : 0.8
  if (kind === 'crystal-sentinel') toward = length < 200 ? -0.4 : 0.4
  e.x += (dirX * toward - dirY * strafe) * step
  e.y += (dirY * toward + dirX * strafe) * step
}

function telegraph(a: FactionArena, e: FactionEnemy): void {
  const def = ENEMY_DEFINITIONS[e.kind]
  const dx = a.hero.x - e.x, dy = a.hero.y - e.y
  const length = Math.max(0.001, Math.sqrt(squared(dx, dy)))
  e.facingX = dx / length
  e.facingY = dy / length
  e.aimX = a.hero.x; e.aimY = a.hero.y
  e.state = 'windup'
  e.releaseFx = 0
  e.timer = def.windup * (e.affix === 'swift' ? 0.8 : 1)
  e.cycle++
  a.onTelegraph?.(e)
}

function summon(r: FactionRuntime, e: FactionEnemy, hero: FactionArena['hero']): void {
  if (e.summonsMade >= 8 || e.hp <= 0) return
  let living = 0
  for (const other of r.enemies) if (other.hp > 0 && other.summonedBy === e.id) living++
  const count = Math.min(2, 4 - living, 8 - e.summonsMade, MAX_FACTION_ENEMIES - r.enemies.length - r.legacyMobCount)
  for (let i = 0; i < count; i++) {
    const angle = (e.summonsMade + i) * 2.399963229728653
    let x = e.x + Math.cos(angle) * 110
    let y = e.y + Math.sin(angle) * 110
    const dx = x - hero.x, dy = y - hero.y
    const distance = Math.sqrt(squared(dx, dy))
    if (distance < 120) {
      x = hero.x + (distance > 0.001 ? dx / distance : 1) * 120
      y = hero.y + (distance > 0.001 ? dy / distance : 0) * 120
    }
    if (spawnFactionEnemy(r, 'shadow-assassin', x, y, { summonedBy: e.id })) e.summonsMade++
  }
}

function fireAttack(a: FactionArena, e: FactionEnemy): void {
  const r = a.runtime, hero = a.hero
  switch (e.kind) {
    case 'necromancer':
      summon(r, e, hero)
      break
    case 'dark-archer':
      addProjectile(r, e, 0, 215, undefined)
      break
    case 'frost-wraith':
      addProjectile(r, e, 0, 195, 'freeze')
      break
    case 'plague-carrier':
      addZone(r, e, e.aimX, e.aimY, 75, e.damage, 'poison', 0.25, 2.7)
      break
    case 'fire-imp':
      addZone(r, e, e.aimX, e.aimY, 82, e.damage, 'burn', 0.3, 0.95)
      break
    case 'crystal-sentinel': {
      // Lock aim before the long warning; a moving hero can evade this line.
      const dx = e.facingX * 400, dy = e.facingY * 400
      if (distanceToSegmentSquared(hero.x, hero.y, e.x, e.y, dx, dy) <= 34 * 34) hitHero(a, e)
      break
    }
    case 'shield-guardian':
      if (squared(hero.x - e.x, hero.y - e.y) <= (e.radius + 50) ** 2) hitHero(a, e)
      break
    case 'berserker':
      if (squared(hero.x - e.x, hero.y - e.y) <= (e.radius + 47) ** 2) hitHero(a, e)
      break
    case 'phantom':
      if (squared(hero.x - e.x, hero.y - e.y) <= (e.radius + 48) ** 2) hitHero(a, e)
      break
    case 'shadow-assassin':
      break
  }
  if (e.affix === 'arcane' && e.kind !== 'shadow-assassin') {
    addProjectile(r, e, -0.12, 210, undefined)
    addProjectile(r, e, 0.12, 210, undefined)
  }
  if (e.affix === 'frozen' && e.kind !== 'frost-wraith')
    addProjectile(r, e, 0, 180, 'freeze')
}

function tickProjectiles(a: FactionArena, dt: number): void {
  const projectiles = a.runtime.projectiles
  let write = 0
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i]!
    const x = p.x, y = p.y
    const travel = Math.min(dt, Math.max(0, p.life))
    const dx = p.vx * travel, dy = p.vy * travel
    p.x += dx; p.y += dy; p.life -= dt
    if (p.life > 0 && distanceToSegmentSquared(a.hero.x, a.hero.y, x, y, dx, dy) <= (p.radius + 15) ** 2
      && (!a.lineOfSight || a.lineOfSight(x, y, a.hero.x, a.hero.y))) {
      // The parent may already be dead; projectiles still deliver their own locked payload.
      const landed = a.onHeroDamage(p.damage, {
        kind: p.kind,
        sourceId: p.sourceId, attackRank: p.attackRank, angle: Math.atan2(p.vy, p.vx),
        ...(p.status ? { status: p.status, duration: 1.2 } : {}),
      })
      if (landed) {
        // A rare hit may look up its source; never scan all enemies per projectile/frame.
        const source = a.runtime.enemies.find(e => e.id === p.sourceId)
        if (source?.affix === 'vampiric' && source.hp > 0)
          source.hp = Math.min(source.max, source.hp + p.damage * 0.35)
      }
      p.life = 0
    }
    if (p.life > 0) projectiles[write++] = p
  }
  projectiles.length = write
}

function tickZones(a: FactionArena, dt: number): void {
  const zones = a.runtime.zones
  let write = 0
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i]!
    zone.life -= dt
    zone.delay -= dt
    if (zone.life > 0 && zone.delay <= 0) {
      zone.tick -= dt
      if (zone.tick <= 0) {
        zone.tick = zone.interval
        if (squared(zone.x - a.hero.x, zone.y - a.hero.y) <= (zone.radius + 15) ** 2
          && (!a.lineOfSight || a.lineOfSight(zone.x, zone.y, a.hero.x, a.hero.y))) {
          a.onHeroDamage(zone.damage, {
            kind: zone.kind,
            sourceId: zone.sourceId,
            ...(zone.status ? { status: zone.status, duration: zone.status === 'poison' ? 2 : 1.2 } : {}),
          })
        }
      }
    }
    if (zone.life > 0) zones[write++] = zone
  }
  zones.length = write
}

/** Independent, allocation-light FSM. Run from the integration owner's fixed simulation tick. */
export function tickFactionEnemies(a: FactionArena, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return
  const { runtime: r, hero } = a
  let fallenWrite = 0
  for (const e of r.fallen) {
    e.deathVisual = Math.max(0, (e.deathVisual ?? 0) - dt)
    if (e.deathVisual > 0) r.fallen[fallenWrite++] = e
  }
  r.fallen.length = fallenWrite
  if (a.legacyMobCount !== undefined && Number.isFinite(a.legacyMobCount))
    r.legacyMobCount = Math.max(0, Math.floor(a.legacyMobCount))
  // Snapshot length: necromancer summons start acting on the following tick.
  const count = r.enemies.length
  for (let i = 0; i < count; i++) {
    const e = r.enemies[i]!
    if (!e || e.hp <= 0) continue
    e.phaseCooldown = Math.max(0, e.phaseCooldown - dt)
    if (e.slow) e.slow = Math.max(0, e.slow - dt)
    if (e.orbCooldown) e.orbCooldown = Math.max(0, e.orbCooldown - dt)
    if (e.visualHold) e.visualHold = Math.max(0, e.visualHold - dt)
    if (e.hitTime) e.hitTime = Math.max(0, e.hitTime - dt)
    if (e.releaseFx) e.releaseFx = Math.max(0, e.releaseFx - dt)
    // Mass-scaled, bounded contact motion; never relocate a committed telegraph or attack.
    if (e.knockRemaining) {
      const duration = Math.min(dt, e.knockRemaining)
      e.knockRemaining = Math.max(0, e.knockRemaining - dt)
      if (e.state === 'approach' || e.state === 'recover') {
        const strength = 115 * Math.min(1, 16 / Math.max(1, e.radius)) * (e.affix === 'armored' ? .6 : 1)
        e.x += (e.hitX ?? 0) * duration * strength
        e.y += (e.hitY ?? 0) * duration * strength
      }
    }
    if (e.state === 'phase') {
      e.timer -= dt
      if (e.timer <= 0) e.state = 'approach'
      continue
    }
    if (e.state === 'recover') {
      e.timer -= dt
      if (e.timer <= 0) e.state = 'approach'
      continue
    }
    if (e.state === 'windup') {
      // Never finish an offscreen or occluded windup without a visible fair attack.
      if (!visibleToHero(a, e) || !hasSight(a, e)) {
        e.state = 'recover'; e.timer = 0.4; continue
      }
      e.timer -= dt
      if (e.timer <= 0) {
        e.releaseFx = 0.32
        if (e.kind === 'shadow-assassin') {
          e.state = 'attack'; e.timer = 0.34; e.hitThisAttack = false
        } else {
          fireAttack(a, e)
          e.state = 'recover'
          e.timer = ENEMY_DEFINITIONS[e.kind].recover
        }
      }
      continue
    }
    if (e.state === 'attack') {
      // A swept segment prevents high-dt assassin dashes tunneling through a hero.
      const ox = e.x, oy = e.y
      const dx = e.aimX - e.x, dy = e.aimY - e.y
      const len = Math.max(0.001, Math.sqrt(squared(dx, dy)))
      const step = Math.min(len, 300 * dt)
      e.x += dx / len * step; e.y += dy / len * step
      if (!e.hitThisAttack && distanceToSegmentSquared(hero.x, hero.y, ox, oy, e.x - ox, e.y - oy) <= (e.radius + 15) ** 2) {
        hitHero(a, e)
        e.hitThisAttack = true
      }
      e.timer -= dt
      if (e.timer <= 0) { e.state = 'recover'; e.timer = 0.85 }
      continue
    }
    const def = ENEMY_DEFINITIONS[e.kind]
    if (e.kind === 'phantom' && e.phaseCooldown === 0
      && squared(hero.x - e.x, hero.y - e.y) < 170 * 170) {
      e.state = 'phase'; e.timer = 0.65; e.phaseCooldown = 4.5
      continue
    }
    // Flanking/spacing movement is deterministic; no A* or per-frame crowd scan.
    move(e, hero, dt)
    if (visibleToHero(a, e)
      && squared(hero.x - e.x, hero.y - e.y) <= def.range * def.range
      && (e.kind !== 'necromancer' || e.summonsMade < 8)
      && hasSight(a, e)) telegraph(a, e)
  }
  tickProjectiles(a, dt)
  tickZones(a, dt)
}

/** Integrator invokes after resolving damage and on run reset to release per-run memory. */
export function cleanupFactionEnemies(runtime: FactionRuntime): void {
  let write = 0
  for (const enemy of runtime.enemies) {
    if (enemy.hp > 0) runtime.enemies[write++] = enemy
    else if (enemy.deathVisual) {
      if (runtime.fallen.length >= 24) runtime.fallen.shift()
      runtime.fallen.push(enemy)
    }
  }
  runtime.enemies.length = write
  // Live projectiles/zones intentionally finish their brief, bounded lifetimes.
}
