import { damageHero } from '../../combat'
import { impact, requestCameraKick } from '../../fx'
import { ATTACK_PRESENTATION } from './attack-presentation'
import choreographyProfiles from './choreography.json'
import { BALANCE } from '../../config'
import { summonBossMinions } from '../../bosses/phases'
import { MAX_MOBS } from '../../constants'
import { getMode } from '../../../meta/modes'
import type { ContentEvent, GameHooks, GameState, Mob, Point } from '../../types'
import { BOSS_ATTACKS, BOSS_DEFINITIONS, type BossAttack, type BossAttackId, type BossCueId, type BossId, type BossShape } from './definitions'

export const MAX_BOSS_PROJECTILES = 48
export const MAX_BOSS_IMPACTS = 12
const MAX_OWNED_MINIONS = 6
const HERO_HIT_RADIUS = 15
const SAFE_HALF_ANGLE = Math.PI / 5

/** Snapshot used unchanged by both the renderer and all hit tests. */
export interface BossTelegraph {
  readonly attackId: string
  readonly shape: BossShape
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly innerRadius: number
  readonly width: number
  readonly angle: number
  readonly length: number
  readonly safeAngle: number
  readonly damage: number
  readonly color: string
  readonly harmless: boolean
  /** Presentation-only: never used by intersectsTelegraph or strike. */
  readonly stage?: 'warning' | 'active'
  readonly progress?: number
}

export interface BossProjectile {
  readonly attackId?: BossAttackId
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly radius: number
  readonly damage: number
  readonly life: number
  readonly color: string
}

export interface BossImpact extends BossTelegraph {
  readonly life: number
  readonly max: number
}

export interface BossFinishFrame { readonly at: number; readonly cue: BossCueId; readonly vfx: string }
export type BossEncounterEvent =
  | { readonly type: 'intro' | 'phase' | 'death'; readonly boss: BossId; readonly phase: 1 | 2 | 3 }
  | { readonly type: 'warning' | 'attack'; readonly boss: BossId; readonly phase: 1 | 2 | 3; readonly attack: BossAttackId }
  | { readonly type: 'reward'; readonly boss: BossId; readonly phase: 1 | 2 | 3; readonly existingCombatXp: 45 }
  | { readonly type: 'finale'; readonly boss: BossId; readonly phase: 3; readonly frames: readonly BossFinishFrame[] }

export interface BossEncounterObserver {
  /** Events are optional: the core encounter remains usable in deterministic tests. */
  emit?(event: BossEncounterEvent): void
  /** Original cue IDs; integration may route them to its asset-backed sound system. */
  cue?(id: BossCueId): void
  /** Cancel stale windups/tails on phase, death or encounter teardown. */
  cancelAttackAudio?(): void
}

/** Presentation state derived from the encounter clock; never used by collision or AI. */
export type BossBodyPose = 'idle' | 'move' | 'windup' | 'attack' | 'recover' | 'hurt' | 'transform' | 'death'
export interface BossBodyMotion {
  readonly pose: BossBodyPose
  readonly phase: 1 | 2 | 3
  readonly progress: number
  readonly x: number
  readonly y: number
  /** Move/held-move only: sign of actual horizontal travel, for direction-locked art. */
  readonly facingX?: -1 | 1
}
export interface BossSnapshot {
  readonly id: BossId | null
  readonly phase: 1 | 2 | 3 | null
  readonly telegraphs: readonly BossTelegraph[]
  readonly projectiles: readonly BossProjectile[]
  readonly impacts?: readonly BossImpact[]
  readonly bodyMotion?: BossBodyMotion
}

export interface BossHud {
  readonly id: BossId
  readonly name: string
  readonly color: string
  readonly phase: 1 | 2 | 3
  readonly phaseName: string
  readonly hp: number
  readonly maxHp: number
  readonly hpPercent: number
}

interface Windup { readonly attackId: BossAttackId; readonly telegraphs: BossTelegraph[]; remaining: number }
interface Hazard { readonly telegraph: BossTelegraph; remaining: number; pulse: number }
interface MutableImpact { readonly telegraph: BossTelegraph; life: number; readonly max: number }
interface MutableProjectile {
  attackId?: BossAttackId
  x: number; y: number; vx: number; vy: number; radius: number
  damage: number; life: number; color: string
}
interface Encounter {
  readonly state: GameState
  readonly boss: Mob
  readonly id: BossId
  phase: 1 | 2 | 3
  turn: number
  safeTurn: number
  recovery: number
  recoveryDuration: number
  transforming: boolean
  deathAt: number | null
  windup: Windup | null
  hazards: Hazard[]
  projectiles: MutableProjectile[]
  impacts: MutableImpact[]
  readonly summoned: Set<Mob>
  rewarded: boolean
  poiseDamage: number
  staggeredPhase: number
  bodyHold: number
  heldBody?: BossBodyMotion
  /** Presentation only: last predominantly horizontal travel sign; unset until one occurs. */
  moveFacingX?: -1 | 1
}

/** Entire damaging geometry uses world coordinates and the same predicate as rendering. */
export function intersectsTelegraph(t: BossTelegraph, x: number, y: number, padding = 0): boolean {
  const dx = x - t.x, dy = y - t.y
  const d2 = dx * dx + dy * dy
  if (t.shape === 'circle') return d2 <= (t.radius + padding) ** 2
  if (t.shape === 'ring') return d2 >= Math.max(0, t.innerRadius - padding) ** 2
    && d2 <= (t.radius + padding) ** 2
  if (t.shape === 'arena') {
    if (d2 > (t.radius + padding) ** 2) return false
    const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - t.safeAngle),
      Math.cos(Math.atan2(dy, dx) - t.safeAngle))
    // The entire center of the safe sector is invulnerable: no hidden center hitbox.
    return Math.abs(delta) > SAFE_HALF_ANGLE
  }
  const vx = Math.cos(t.angle), vy = Math.sin(t.angle)
  const along = Math.max(0, Math.min(t.length, dx * vx + dy * vy))
  const ox = dx - along * vx, oy = dy - along * vy
  return ox * ox + oy * oy <= (t.width + padding) ** 2
}

const BODY_TRANSFORM_SECONDS = 0.85
const BODY_DEATH_SECONDS = 1.2
const clampBodyProgress = (value: number): number => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

function bodyMotion(e: Encounter): BossBodyMotion | undefined {
  const frame = (pose: BossBodyPose, progress: number, facingX?: -1 | 1): BossBodyMotion => ({
    pose, phase: e.phase, progress: clampBodyProgress(progress), x: e.boss.x, y: e.boss.y, facingX,
  })
  if (e.boss.hp <= 0 || e.rewarded) {
    if (e.deathAt === null) return undefined
    const progress = (e.state.worldClock - e.deathAt) / BODY_DEATH_SECONDS
    return progress < 1 ? frame('death', progress) : undefined
  }
  if (e.transforming && e.recovery > 0)
    return frame('transform', 1 - e.recovery / BODY_TRANSFORM_SECONDS)
  if ((e.boss.weaknessRemaining ?? 0) > 0) return frame('hurt', 1 - e.boss.weaknessRemaining! / BALANCE.bosses.weaknessSeconds)
  if (e.bodyHold > 0 && e.heldBody) return frame(e.heldBody.pose, e.heldBody.progress, e.heldBody.facingX)
  if (e.windup)
    return frame('windup', 1 - e.windup.remaining / BOSS_ATTACKS[e.windup.attackId].windup)
  const impact = e.impacts[e.impacts.length - 1]
  // Longer cosmetic tails must not hold the actor in its old attack pose.
  if (impact && impact.max > 0 && impact.max - impact.life < 0.56) {
    const progress = clampBodyProgress((impact.max - impact.life) / 0.56)
    return progress < 0.5 ? frame('attack', progress * 2) : frame('recover', (progress - 0.5) * 2)
  }
  if (e.boss.hit > 0) return frame('hurt', 1 - e.boss.hit / 0.16)
  if (e.boss.bossMoving) return frame('move', (e.state.worldClock * 1.4) % 1, e.moveFacingX)
  if (e.recovery > 0 && e.recoveryDuration > 0)
    return frame('recover', 1 - e.recovery / e.recoveryDuration)
  return frame('idle', (e.state.worldClock * 0.65) % 1)
}

function phaseFor(boss: Mob): 1 | 2 | 3 {
  const remaining = boss.hp / Math.max(1, boss.max)
  return remaining <= 1 / 3 ? 3 : remaining <= 2 / 3 ? 2 : 1
}

function lockLegacyBrain(boss: Mob): void {
  // Integration ticks AFTER tickEnemies. Reuse the AI record instead of
  // allocating a new object every simulation frame.
  if (!boss.ai) {
    boss.ai = {
      state: 'recover', timer: 1_000_000, attack: 'slam',
      aimX: boss.x, aimY: boss.y, dirX: 0, dirY: 0, cycle: 0,
    }
  } else {
    boss.ai.state = 'recover'
    boss.ai.timer = 1_000_000
  }
}

/** Pursue only during recovery so locked telegraphs never drift from their displayed hitboxes. */
function pursueHero(e: Encounter, dt: number): void {
  const hero = e.state.hero
  if (!hero) return
  const dx = hero.x - e.boss.x, dy = hero.y - e.boss.y
  const distance = Math.hypot(dx, dy)
  if (distance < 0.001) return
  const motion = BALANCE.bosses.movement[e.id]
  const slowed = e.boss.slow > 0 ? BALANCE.enemies.ai.slowedSpeedMultiplier : 1
  const staggered = e.boss.stagger > 0 ? BALANCE.enemies.ai.staggeredSpeedMultiplier : 1
  const speed = e.boss.speed * BALANCE.bosses.phaseMovementMultipliers[e.phase - 1]! * slowed * staggered
  const toward = Math.min(Math.max(0, distance - motion.standoff), speed * dt)
  const orbit = toward === 0 && motion.orbitSpeed > 0
    ? motion.orbitSpeed * dt * (e.turn % 2 ? 1 : -1) * slowed * staggered : 0
  if (toward === 0 && orbit === 0) return
  const stepX = dx / distance * toward - dy / distance * orbit
  const stepY = dy / distance * toward + dx / distance * orbit
  e.boss.x += stepX
  e.boss.y += stepY
  // Hysteresis: near-vertical travel keeps the previous facing instead of popping per tick.
  if (Math.abs(stepX) > Math.abs(stepY) * 0.5) e.moveFacingX = stepX > 0 ? 1 : -1
  e.boss.bossMoving = true
}

function makeTelegraphs(e: Encounter, id: BossAttackId, hero: Point, color: string): BossTelegraph[] {
  const attack: BossAttack = BOSS_ATTACKS[id]
  const targetAngle = Math.atan2(hero.y - e.boss.y, hero.x - e.boss.x)
  const count = attack.kind === 'projectile' ? attack.count ?? 1 : 1
  const list: BossTelegraph[] = []
  for (let i = 0; i < count; i++) {
    const angle = targetAngle + (i - (count - 1) / 2) * 0.20
    const safeAngle = e.safeTurn * Math.PI / 2
    const atTarget = attack.shape === 'circle' && !['titan-slam', 'titan-rage', 'winter-burst', 'abyss-summon'].includes(id)
    list.push({
      attackId: id, shape: attack.shape,
      x: atTarget ? hero.x : e.boss.x,
      y: atTarget ? hero.y : e.boss.y,
      radius: attack.radius,
      innerRadius: attack.innerRadius ?? 0,
      width: attack.width ?? 0,
      length: attack.length ?? 0,
      angle,
      safeAngle,
      damage: attack.damage,
      color,
      harmless: attack.kind === 'summon',
    })
  }
  if (attack.shape === 'arena') e.safeTurn++
  return list
}

function cleanOwnedMinions(e: Encounter): void {
  if (!e.summoned.size) return
  e.state.mobs = e.state.mobs.filter(mob => !e.summoned.has(mob))
  e.summoned.clear()
}

function clearTransient(e: Encounter): void {
  e.transforming = false
  e.bodyHold = 0; e.heldBody = undefined; e.poiseDamage = 0
  e.boss.weaknessRemaining = 0
  e.windup = null
  e.hazards.length = 0
  e.projectiles.length = 0
  e.impacts.length = 0
  // Clear only this pack's transient VFX; never touch another feature pack.
  e.state.content.effects = e.state.content.effects.filter(fx => !fx.id.startsWith('bosses:'))
}

function strike(state: GameState, t: BossTelegraph, hooks: GameHooks, direct = true): void {
  const hero = state.hero
  if (!hero || t.harmless || state.mode !== 'play') return
  if (intersectsTelegraph(t, hero.x, hero.y, HERO_HIT_RADIUS)) damageHero(state, t.damage, hooks, undefined, { rank: direct ? 'boss' : undefined, angle: Math.atan2(hero.y - t.y, hero.x - t.x) })
}

function advanceProjectiles(e: Encounter, dt: number, hooks: GameHooks): void {
  const state = e.state
  const hero = state.hero
  if (!hero) return
  for (const p of e.projectiles) {
    const sx = p.x, sy = p.y
    const travel = Math.min(dt, Math.max(0, p.life))
    const dx = p.vx * travel, dy = p.vy * travel
    p.x += dx; p.y += dy; p.life -= dt
    if (travel <= 0 || hero.hp <= 0) continue
    const distance2 = dx * dx + dy * dy
    const t = distance2 ? Math.max(0, Math.min(1,
      ((hero.x - sx) * dx + (hero.y - sy) * dy) / distance2)) : 0
    const ox = hero.x - (sx + dx * t), oy = hero.y - (sy + dy * t)
    if (ox * ox + oy * oy <= (p.radius + HERO_HIT_RADIUS) ** 2) {
      damageHero(state, p.damage, hooks, undefined, { rank: 'boss', angle: Math.atan2(dy, dx) })
      p.life = 0 // Swept collision and exactly one hit for this projectile.
    }
  }
  e.projectiles = e.projectiles.filter(p => p.life > 0)
}

function advanceHazards(e: Encounter, dt: number, hooks: GameHooks): void {
  for (const h of e.hazards) {
    // A stationary zone has a warning and a visible 0.8-second damage pulse.
    h.pulse -= dt
    if (h.pulse <= 0 && h.remaining > 0) {
      strike(e.state, h.telegraph, hooks, false)
      h.pulse = 0.8
    }
    h.remaining -= dt
  }
  e.hazards = e.hazards.filter(h => h.remaining > 0)
}

export interface BossEncounterController {
  spawn(state: GameState, id: BossId, point: Point, hooks: GameHooks): Mob | null
  tick(state: GameState, dt: number, hooks: GameHooks): void
  onContentEvent(state: GameState, event: ContentEvent, hooks: GameHooks): void
  reset(state: GameState): void
  snapshot(state: GameState): BossSnapshot
  hud(state: GameState): BossHud | null
}

/**
 * Per-engine encounter controller, no global mutable AI and no changes to
 * legacy combat, victory rules, save format, or the integration-owned manifest.
 */
export function createBossEncounterController(observer: BossEncounterObserver = {}): BossEncounterController {
  let encounter: Encounter | null = null

  function notify(event: BossEncounterEvent): void { observer.emit?.(event) }
  function cue(id: BossCueId): void { observer.cue?.(id) }
  function cancelTransient(e: Encounter): void { clearTransient(e); observer.cancelAttackAudio?.() }

  function current(state: GameState): Encounter | null {
    return encounter?.state === state ? encounter : null
  }

  function release(e: Encounter, windup: Windup, hooks: GameHooks): void {
    const attack: BossAttack = BOSS_ATTACKS[windup.attackId]
    // Capped, deterministic release accents. The collision geometry remains untouched.
    for (const telegraph of windup.telegraphs) {
      if (e.impacts.length >= MAX_BOSS_IMPACTS) break
      const duration = choreographyProfiles[windup.attackId].duration
      e.impacts.push({ telegraph, life: duration, max: duration })
      // A volley has one launch accent, not one full overlay per projectile.
      if (attack.kind === 'projectile') break
    }
    notify({ type: 'attack', boss: e.id, phase: e.phase, attack: windup.attackId })
    // Exactly one major release nudge, never per projectile or hazard tick.
    const shake = ATTACK_PRESENTATION[windup.attackId].shake
    if (shake > 0) requestCameraKick(e.state, shake)
    cue(BOSS_DEFINITIONS[e.id].attackCue)
    if (attack.kind === 'summon') {
      // Reuse the existing six-minion implementation rather than introducing
      // another spawning system; track exactly the minions this encounter owns.
      // The cap tracks LIVING minions, not a lifetime quota. Prune killed or
      // culled references at summon time, not on every animation frame.
      for (const minion of e.summoned) {
        if (minion.hp <= 0 || !e.state.mobs.includes(minion)) e.summoned.delete(minion)
      }
      const before = new Set(e.state.mobs)
      if (e.summoned.size < MAX_OWNED_MINIONS) summonBossMinions(e.state, e.boss, hooks.otherLivingActors?.() ?? 0)
      for (const mob of e.state.mobs) if (!before.has(mob)) e.summoned.add(mob)
      return
    }
    if (attack.kind === 'projectile') {
      for (const t of windup.telegraphs) {
        if (e.projectiles.length >= MAX_BOSS_PROJECTILES) break
        const speed = attack.speed ?? 220
        e.projectiles.push({
          attackId: windup.attackId, x: t.x, y: t.y, vx: Math.cos(t.angle) * speed, vy: Math.sin(t.angle) * speed,
          radius: attack.radius, damage: attack.damage,
          life: t.length / speed, color: t.color,
        })
      }
      return
    }
    if (attack.kind === 'zone') {
      for (const t of windup.telegraphs) {
        e.hazards.push({ telegraph: t, remaining: attack.duration ?? 2, pulse: 0 })
      }
    } else {
      for (const t of windup.telegraphs) strike(e.state, t, hooks)
    }
  }

  function warn(e: Encounter): void {
    const definition = BOSS_DEFINITIONS[e.id]
    const attacks = definition.phases[e.phase - 1]
    const attackId = attacks[e.turn % attacks.length]!
    e.turn++
    e.poiseDamage = 0
    const hero = e.state.hero!
    const attack: BossAttack = BOSS_ATTACKS[attackId]
    e.windup = {
      attackId, remaining: attack.windup,
      telegraphs: makeTelegraphs(e, attackId, hero, definition.color),
    }
    notify({ type: 'warning', boss: e.id, phase: e.phase, attack: attackId })
  }

  function reset(state: GameState): void {
    const e = current(state)
    if (!e) return
    cancelTransient(e)
    cleanOwnedMinions(e)
    encounter = null
  }

  return {
    spawn(state, id, point, hooks) {
      // A finalized encounter keeps its death presentation until a new boss is due.
      if ((encounter && (encounter.state !== state || !encounter.rewarded || encounter.boss.hp > 0)) || !state.hero || state.mode !== 'play'
        || !Number.isFinite(point.x) || !Number.isFinite(point.y)
        || state.mobs.length + (hooks.otherLivingActors?.() ?? 0) >= MAX_MOBS + 1
        || state.mobs.some(m => m.type === 'boss' && m.hp > 0)) return null
      const definition = BOSS_DEFINITIONS[id]
      if (!definition) return null
      const hp = Math.round(definition.health * getMode(state.runMode).modifiers.enemyHp)
      const boss: Mob = {
        x: point.x, y: point.y, type: 'boss', bossArtId: id,
        hp, max: hp, r: 48, speed: BALANCE.bosses.movement[id].speed, dmg: 22,
        bossMoving: false,
        phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0, bossPhase: 1,
      }
      lockLegacyBrain(boss)
      state.mobs.push(boss)
      state.bossSpawned = true
      state.bossDefeated = false
      encounter = {
        state, boss, id, phase: 1, turn: 0, safeTurn: 0, recovery: 0,
        recoveryDuration: 0, transforming: false, deathAt: null,
        windup: null, hazards: [], projectiles: [], impacts: [], summoned: new Set<Mob>(),
        rewarded: false, poiseDamage: 0, staggeredPhase: 0, bodyHold: 0,
      }
      hooks.sfx('boss')
      cue(definition.introCue)
      notify({ type: 'intro', boss: id, phase: 1 })
      return boss
    },
    tick(state, dt, hooks) {
      const e = current(state)
      if (!e || !Number.isFinite(dt) || dt <= 0) return
      if (e.boss.hp <= 0 || e.rewarded) return
      if (state.mode !== 'play' || !state.hero || state.hero.hp <= 0) return
      // The host must call AFTER legacy tickEnemies, which has no extensibility
      // point. The integration adapter owns only this one boss's AI.
      lockLegacyBrain(e.boss)
      e.boss.bossMoving = false
      e.bodyHold = Math.max(0, e.bodyHold - dt)
      if (e.bodyHold === 0) e.heldBody = undefined
      e.boss.weaknessRemaining = Math.max(0, (e.boss.weaknessRemaining ?? 0) - dt)
      const phase = phaseFor(e.boss)
      if (phase > e.phase) {
        e.phase = phase; e.boss.bossPhase = phase
        e.turn = 0
        cancelTransient(e)
        e.recovery = BODY_TRANSFORM_SECONDS
        e.transforming = true
        cue(BOSS_DEFINITIONS[e.id].transitionCue)
        notify({ type: 'phase', boss: e.id, phase })
        hooks.message(`${BOSS_DEFINITIONS[e.id].title} — ${BOSS_DEFINITIONS[e.id].phaseNames[phase - 1]}`)
        return
      }
      // Fade release accents in simulation time; paused encounters do not advance.
      for (let i = e.impacts.length - 1; i >= 0; i--) {
        e.impacts[i]!.life -= dt
        if (e.impacts[i]!.life <= 0) e.impacts.splice(i, 1)
      }
      advanceProjectiles(e, dt, hooks)
      advanceHazards(e, dt, hooks)
      if (state.hero.hp <= 0 || state.mode !== 'play') return
      if (e.windup) {
        e.windup.remaining -= dt
        if (e.windup.remaining <= 0) {
          const ready = e.windup
          e.windup = null
          release(e, ready, hooks)
          e.recovery = BOSS_ATTACKS[ready.attackId].recover
          e.recoveryDuration = e.recovery
        }
        return
      }
      if (e.recovery > 0) {
        if (!(e.boss.weaknessRemaining! > 0)) pursueHero(e, Math.min(dt, e.recovery))
        e.recovery = Math.max(0, e.recovery - dt)
        if (e.recovery > 0) return
      }
      e.transforming = false
      warn(e)
    },
    onContentEvent(state, event, hooks) {
      const e = current(state)
      if (!e) return
      if (event.type === 'reset') { reset(state); return }
      if (event.type === 'scene-change' || event.type === 'run-complete') {
        cancelTransient(e)
        cleanOwnedMinions(e)
        e.recovery = 1.4
        return
      }
      if (event.type === 'hit' && event.mob === e.boss && e.boss.hp > 0) {
        if (e.bodyHold <= 0 && e.boss.lastVisualHoldAt === state.time && e.boss.visualHold) {
          e.heldBody = bodyMotion(e)
          e.bodyHold = e.boss.visualHold
        }
        // One break per phase. A telegraphed attack is never cancelled by routine hits.
        if (!e.windup && !e.transforming && e.recovery > 0 && e.staggeredPhase !== e.phase && phaseFor(e.boss) === e.phase) {
          e.poiseDamage += event.damage
          if (e.poiseDamage >= e.boss.max * BALANCE.bosses.poiseDamageFraction) {
            e.staggeredPhase = e.phase
            e.boss.weaknessRemaining = BALANCE.bosses.weaknessSeconds
            e.recovery = Math.max(e.recovery, BALANCE.bosses.weaknessSeconds)
            e.recoveryDuration = e.recovery
            impact(state, e.boss.x, e.boss.y, 135, '#e3c3ff', 2.5)
            hooks.message('首領破防 · 傷害提升')
            hooks.sfx('bossStagger')
          }
        }
        return
      }
      if (event.type !== 'kill' || event.mob !== e.boss || e.rewarded || e.boss.hp > 0) return
      e.rewarded = true
      e.deathAt = state.worldClock
      cancelTransient(e)
      cleanOwnedMinions(e)
      cue(BOSS_DEFINITIONS[e.id].deathCue)
      notify({ type: 'death', boss: e.id, phase: e.phase })
      // Combat.hit() has ALREADY granted exactly 45 XP and set bossDefeated.
      // Never spawn another XP crystal or count a second kill here.
      notify({ type: 'reward', boss: e.id, phase: e.phase, existingCombatXp: 45 })
      if (e.id === 'eclipse-seraph') {
        notify({ type: 'finale', boss: e.id, phase: 3, frames: [
          { at: 0, cue: 'bosses:seraph-fracture', vfx: 'bosses:seraph-light-break' },
          { at: 0.4, cue: 'bosses:seraph-collapse', vfx: 'bosses:seraph-dark-collapse' },
          { at: 1.1, cue: 'bosses:seraph-release', vfx: 'bosses:finishing-flare' },
        ] })
      }
    },
    reset,
    snapshot(state) {
      const e = current(state)
      if (!e) return { id: null, phase: null, telegraphs: [], projectiles: [], impacts: [] }
      return {
        id: e.id, phase: e.phase,
        bodyMotion: bodyMotion(e),
        telegraphs: [
          ...(e.windup?.telegraphs.map(t => ({ ...t, stage: 'warning' as const,
            progress: Math.max(0, Math.min(1, 1 - e.windup!.remaining / BOSS_ATTACKS[e.windup!.attackId].windup)),
          })) ?? []),
          ...e.hazards.map(h => ({ ...h.telegraph, stage: 'active' as const,
            progress: Math.max(0, Math.min(1, 1 - h.remaining / Math.max(0.01, BOSS_ATTACKS[h.telegraph.attackId as BossAttackId].duration ?? 2))),
          })),
        ],
        projectiles: e.projectiles.map(p => ({ ...p })),
        impacts: e.impacts.map(i => ({ ...i.telegraph, life: i.life, max: i.max })),
      }
    },
    hud(state) {
      const e = current(state)
      if (!e || e.boss.hp <= 0) return null
      const def = BOSS_DEFINITIONS[e.id]
      return {
        id: e.id, name: def.title, color: def.color, phase: e.phase,
        phaseName: def.phaseNames[e.phase - 1],
        hp: e.boss.hp, maxHp: e.boss.max,
        hpPercent: Math.max(0, Math.min(100, e.boss.hp / Math.max(1, e.boss.max) * 100)),
      }
    },
  }
}
