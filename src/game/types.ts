// Shared engine types. Field names mirror the original single-file game (index.html at c60536c).

import type { RunModeId, CosmeticId } from '../meta/types'

export type GameMode = 'menu' | 'play' | 'level' | 'paused' | 'result'
export type JobId = 'knight' | 'ranger' | 'wizard'
/** Selected identity stays distinct from its legacy sprite/attack fallback. */
export type HeroId = JobId | import('./content/heroes').SpecializationId
export type MobType = 'slime' | 'bat' | 'goblin' | 'golem' | 'warlock' | 'boss'
export type UpgradeId =
  | 'damage' | 'speed' | 'haste' | 'maxhp' | 'multi' | 'orb' | 'magnet' | 'heal'
  | 'bolt' | 'frost' | 'meteor' | 'blaze' | 'vortex' | 'shield' | 'chain'
export type EvolutionId = 'frozen-thunderstorm' | 'infernal-singularity' | 'apocalypse-rain' | 'blade-tempest' | 'guardian-sanctuary'
export type ContentId = `${string}:${string}`
export type AbilityId = UpgradeId | EvolutionId | ContentId
export type SkillRarity = 'common' | 'rare' | 'legendary'
export type Weather = 'sunshower' | 'storm' | 'snow' | 'embers'
export type ArtKey = JobId | Exclude<MobType, 'warlock'> | 'ground' | 'courtyard'

/** Every SFX cue name in the original `sfxCues` / `sfxCooldown` tables. */
export type SfxCue =
  | 'ui' | 'hover' | 'select' | 'start' | 'pause' | 'resume' | 'upgrade' | 'level' | 'dash'
  | 'knight' | 'ranger' | 'wizard' | 'chain' | 'kill' | 'boss' | 'bossDefeat' | 'hurt' | 'pickup'
  | 'scene' | 'deny' | 'victory' | 'defeat' | 'bolt' | 'frost' | 'meteor' | 'vortex'

export interface JobDef { label: string; hp: number; speed: number; damage: number; delay: number; range: number }
/** Original tuple `[id, icon, title, desc]` as a named record. */
export interface UpgradeDef {
  id: AbilityId; icon: string; title: string; desc: string; rarity: SkillRarity
  maxLevel: number; level?: number; requirements?: string; isEvolution?: boolean
  /** Optional Vite-imported asset URL for content packs; built-ins keep existing art lookup. */
  iconSrc?: string
}
export interface BaseUpgradeDef extends UpgradeDef { id: UpgradeId }
export interface SceneDef { name: string; weather: Weather; label: string }

export type Skills = Partial<Record<UpgradeId, number>>

export interface Hero {
  x: number; y: number; hp: number; max: number; level: number; xp: number; need: number
  damage: number; delay: number; speed: number; range: number
  attack: number; inv: number; dash: number; dashCd: number; face: 1 | -1; aimAngle: number
  skills: Skills
  evolutions: Partial<Record<EvolutionId, boolean>>
  evolutionCd: Partial<Record<EvolutionId, number>>
  orbit: number; bolt: number; chainCd: number; frostCd: number; meteorCd: number
  blazeTick: number; vortexCd: number; shieldPulse: number
  step: number; moveAmount: number; strike: number; poseSeed: number; levelAnim: number
  vx: number; vy: number; footDistance: number
}

export interface Mob {
  /** Authored production identity for controller-owned bosses; absent on the legacy boss. */
  bossArtId?: import('./content/bosses/definitions').BossId
  x: number; y: number; type: MobType; hp: number; max: number; r: number; speed: number; dmg: number
  phase: number; hit: number; slow: number; stagger: number; kx: number; ky: number
  ai?: EnemyBrain
  elite?: boolean
  bossPhase?: 1 | 2 | 3
  summonedByBoss?: boolean
}

export type EnemyAttack = 'pounce' | 'dive' | 'jab' | 'slam' | 'bolt' | 'summon'
export interface EnemyBrain {
  state: 'approach' | 'windup' | 'attack' | 'recover'
  timer: number
  attack: EnemyAttack
  aimX: number; aimY: number; dirX: number; dirY: number
  cycle: number
  hitThisAttack?: boolean
}
export interface EnemyProjectile {
  x: number; y: number; vx: number; vy: number
  radius: number; damage: number; life: number
}

export interface Shot {
  x: number; y: number; vx: number; vy: number; life: number; d: number
  kind: 'arrow' | 'magic'; r: number; prevX?: number; prevY?: number
}

export interface Star { x: number; y: number; value: number; t: number; dead?: boolean }

export type FxType = 'spark' | 'footstep' | 'ice' | 'meteor' | 'ember' | 'vortex'
export interface Fx {
  x: number; y: number; vx?: number; vy?: number; life: number; max: number
  color: string; r: number; type?: FxType; a?: number
}

/** A bounded, per-run canvas effect emitted by registered content. */
export interface ContentVisualFx { id: ContentId; x: number; y: number; life: number; max: number }
export interface ContentRuntime {
  levels: Partial<Record<ContentId, number>>
  cooldowns: Partial<Record<ContentId, number>>
  effects: ContentVisualFx[]
}

export type ContentEvent =
  | { type: 'hit' | 'kill'; mob: Mob; damage: number }
  | { type: 'critical-hit'; x: number; y: number }
  | { type: 'damage'; amount: number }
  | { type: 'pickup'; kind: 'xp' | 'world'; amount?: number }
  | { type: 'start' | 'reset' }
  | { type: 'scene-change'; index: number }
  | { type: 'run-complete'; win: boolean }

export interface Swipe { x: number; y: number; a: number; life: number; max: number; r: number }
export interface NumberFx { x: number; y: number; life: number; value: number; boss: boolean; critical?: boolean; received?: boolean }
export interface ImpactWave { x: number; y: number; size: number; color: string; life: number; max: number }
export interface Point { x: number; y: number }
export interface LightningFx { pts: Point[]; life: number; max: number }
export interface MotionEcho { x: number; y: number; kind: JobId; frame: number; angle: number; life: number; max: number }

export type WorldEventKind = 'chest' | 'shrine' | 'invasion' | 'blessing' | 'bargain' | 'challenge'
export interface WorldEvent extends Point { id: number; kind: WorldEventKind; expiresAt: number }

/** Everything the original kept in IIFE-level `let`s that gameplay and rendering read. */
export interface GameState {
  mode: GameMode
  choice: JobId
  /** Real selected hero identity; choice remains the current legacy renderer fallback. */
  heroId: HeroId
  hero: Hero | null
  /** Owned by this run; never stored in a module singleton or rebuilt per frame. */
  content: ContentRuntime
  mobs: Mob[]
  shots: Shot[]
  enemyShots: EnemyProjectile[]
  stars: Star[]
  fx: Fx[]
  swipes: Swipe[]
  numberFx: NumberFx[]
  impactWaves: ImpactWave[]
  lightningFx: LightningFx[]
  motionEchoes: MotionEcho[]
  cameraKick: number
  /** Game-clock time of the last accepted screen recoil; prevents crowd-hit shake loops. */
  lastCameraKickAt: number
  time: number
  kill: number
  spawnT: number
  bossSpawned: boolean
  bossDefeated: boolean
  runMode: RunModeId
  cosmetic: CosmeticId
  damageDealt: number
  damageTaken: number
  defeatedTypes: Partial<Record<MobType, number>>
  worldClock: number
  sceneFxClock: number
  cam: Point
  levelQueue: number
  currentScene: number
  events: WorldEvent[]
  eventSerial: number
  nextEventAt: number
  sceneEnteredAt: number
  hazardLastHitAt: number
  blessingUntil: number
  challengeUntil: number
  challengePoint: Point | null
  /** Viewport in CSS pixels (original `W`, `H`); spawn radius depends on it. */
  W: number
  H: number
}

/** Normalised movement input (keyboard + joystick), original `x`/`y` in update(). */
export interface MoveInput { x: number; y: number }

/**
 * Side effects gameplay logic triggers. The engine implements these; tests pass spies.
 * Mirrors the original free functions `playSfx`, `message`, `chooseUpgrade`, `end`.
 */
export interface GameHooks {
  sfx(cue: SfxCue): void
  message(text: string): void
  /** Original `chooseUpgrade()`: switch to 'level' mode and offer 3 upgrades. */
  offerUpgrades(): void
  /** Original `end(win)`. */
  end(win: boolean): void
  /** Optional for standalone combat/unit tests and legacy call sites. */
  content?(state: GameState, event: ContentEvent): void
  /** Optional integration bridge: only an accepted chest consumes its serial for relic rewards. */
  openTreasure?(state: GameState, chestId: number): boolean
  /** Optional per-run combat intercepts, resolved exactly once in legacy hit/damage paths. */
  modifyOutgoingDamage?(amount: number): number
  /** One-shot metadata from the authoritative outgoing-damage roll. */
  consumeCriticalHit?(): boolean
  mitigateIncomingDamage?(amount: number): number
  afterDamage?(amount: number): void
  canTargetHero?(): boolean
}
