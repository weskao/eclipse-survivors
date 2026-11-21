// Shared engine types. Field names mirror the original single-file game (index.html at c60536c).

export type GameMode = 'menu' | 'play' | 'level' | 'paused' | 'result'
export type JobId = 'knight' | 'ranger' | 'wizard'
export type MobType = 'slime' | 'bat' | 'goblin' | 'golem' | 'boss'
export type UpgradeId =
  | 'damage' | 'speed' | 'haste' | 'maxhp' | 'multi' | 'orb' | 'magnet' | 'heal'
  | 'bolt' | 'frost' | 'meteor' | 'blaze' | 'vortex' | 'shield' | 'chain'
export type Weather = 'sunshower' | 'storm' | 'snow' | 'embers'
export type ArtKey = JobId | MobType | 'ground' | 'courtyard'

/** Every SFX cue name in the original `sfxCues` / `sfxCooldown` tables. */
export type SfxCue =
  | 'ui' | 'hover' | 'select' | 'start' | 'pause' | 'resume' | 'upgrade' | 'level' | 'dash'
  | 'knight' | 'ranger' | 'wizard' | 'chain' | 'kill' | 'boss' | 'bossDefeat' | 'hurt' | 'pickup'
  | 'scene' | 'victory' | 'defeat' | 'bolt' | 'frost' | 'meteor' | 'vortex'

export interface JobDef { label: string; hp: number; speed: number; damage: number; delay: number; range: number }
/** Original tuple `[id, icon, title, desc]` as a named record. */
export interface UpgradeDef { id: UpgradeId; icon: string; title: string; desc: string }
export interface SceneDef { name: string; weather: Weather; label: string }

export type Skills = Partial<Record<UpgradeId, number>>

export interface Hero {
  x: number; y: number; hp: number; max: number; level: number; xp: number; need: number
  damage: number; delay: number; speed: number; range: number
  attack: number; inv: number; dash: number; dashCd: number; face: 1 | -1
  skills: Skills
  orbit: number; bolt: number; chainCd: number; frostCd: number; meteorCd: number
  blazeTick: number; vortexCd: number; shieldPulse: number
  step: number; moveAmount: number; strike: number; poseSeed: number; levelAnim: number
  vx: number; vy: number; footDistance: number
}

export interface Mob {
  x: number; y: number; type: MobType; hp: number; max: number; r: number; speed: number; dmg: number
  phase: number; hit: number; slow: number; stagger: number; kx: number; ky: number
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

export interface Swipe { x: number; y: number; a: number; life: number; max: number; r: number }
export interface NumberFx { x: number; y: number; life: number; value: number; boss: boolean }
export interface ImpactWave { x: number; y: number; size: number; color: string; life: number; max: number }
export interface Point { x: number; y: number }
export interface LightningFx { pts: Point[]; life: number; max: number }
export interface MotionEcho { x: number; y: number; kind: JobId; frame: number; angle: number; life: number; max: number }

/** Everything the original kept in IIFE-level `let`s that gameplay and rendering read. */
export type WorldEventKind = 'chest' | 'shrine' | 'invasion' | 'blessing' | 'bargain' | 'challenge'
export interface WorldEvent extends Point { id: number; kind: WorldEventKind; expiresAt: number }

export interface GameState {
  mode: GameMode
  choice: JobId
  hero: Hero | null
  mobs: Mob[]
  shots: Shot[]
  stars: Star[]
  fx: Fx[]
  swipes: Swipe[]
  numberFx: NumberFx[]
  impactWaves: ImpactWave[]
  lightningFx: LightningFx[]
  motionEchoes: MotionEcho[]
  cameraKick: number
  time: number
  kill: number
  spawnT: number
  bossSpawned: boolean
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
}
