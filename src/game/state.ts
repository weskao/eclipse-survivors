import { BALANCE } from './config'
import { emptyCombatTelemetry } from './combat-telemetry'
import { emptyKillStreak } from './kill-streak'
import { JOB, SCENES } from './constants'
import type { GameState, Hero, JobId, SceneDef } from './types'

export function createState(): GameState {
  return {
    mode: 'menu', choice: 'knight', heroId: 'knight', hero: null, content: { levels: {}, cooldowns: {}, effects: [] },
    mobs: [], fallenMobs: [], shots: [], enemyShots: [], stars: [], fx: [], swipes: [],
    numberFx: [], impactWaves: [], lightningFx: [], motionEchoes: [],
    cameraKick: 0, lastCameraKickAt: -Infinity, time: 0, kill: 0, killStreak: emptyKillStreak(), spawnT: 0, bossSpawned: false, bossDefeated: false,
    combatTelemetry: emptyCombatTelemetry(), directorSeed: 0, factionSpawnWindow: 0, factionSpawnSequence: 0,
    runMode: 'quick', cosmetic: 'knight-default', damageDealt: 0, damageTaken: 0, xpGainMultiplier: 1, pickupGainMultiplier: 1, defeatedTypes: {},
    worldClock: 0, sceneFxClock: 0, cam: { x: 0, y: 0 }, levelQueue: 0, currentScene: 0,
    events: [], eventSerial: 0, nextEventAt: BALANCE.events.firstSpawnAt, sceneEnteredAt: 0,
    hazardLastHitAt: -Infinity, blessingUntil: 0, magnetUntil: 0, challengeUntil: 0, challengePoint: null,
    W: 0, H: 0,
  }
}

/** Original `start()` hero literal. */
export function createHero(job: JobId): Hero {
  const j = JOB[job]
  return {
    x: 0, y: 0, hp: j.hp, max: j.hp, level: 1, xp: 0, need: BALANCE.progression.initialXp, damage: j.damage, delay: j.delay,
    speed: j.speed, range: j.range, attack: 0, inv: 0, dash: 0, dashCd: 0, face: 1, aimAngle: 0, skills: {}, evolutions: {}, evolutionCd: {},
    orbit: 0, bolt: 0, chainCd: 0, frostCd: 0, meteorCd: 0, blazeTick: 0, vortexCd: 0, shieldPulse: 0,
    step: 0, moveAmount: 0, strike: 0, poseSeed: 0, levelAnim: 0, vx: 0, vy: 0, footDistance: 0,
  }
}

/** Original `start()` run reset (everything except audio/UI side effects). */
export function resetRun(s: GameState): void {
  delete s.hall
  s.hero = createHero(s.choice)
  s.content = { levels: {}, cooldowns: {}, effects: [] }
  s.mobs = []; s.fallenMobs = []; s.shots = []; s.enemyShots = []; s.stars = []; s.fx = []; s.swipes = []
  s.time = 0; s.kill = 0; s.killStreak = emptyKillStreak(); s.spawnT = 0; s.bossSpawned = false; s.bossDefeated = false
  s.combatTelemetry = emptyCombatTelemetry(); s.directorSeed = 0; s.factionSpawnWindow = 0; s.factionSpawnSequence = 0
  s.damageDealt = 0; s.damageTaken = 0; s.xpGainMultiplier = 1; s.pickupGainMultiplier = 1; s.defeatedTypes = {}
  s.numberFx = []; s.impactWaves = []; s.lightningFx = []; s.motionEchoes = []
  s.cameraKick = 0; s.cameraKickAngle = undefined; s.lastCameraKickAt = -Infinity; s.cam.x = s.cam.y = 0; s.levelQueue = 0; s.currentScene = 0
  s.events = []; s.eventSerial = 0; s.nextEventAt = BALANCE.events.firstSpawnAt; s.sceneEnteredAt = 0
  s.hazardLastHitAt = -Infinity; s.blessingUntil = 0; s.magnetUntil = 0; s.challengeUntil = 0; s.challengePoint = null
}

export const currentSceneInfo = (s: GameState): SceneDef =>
  SCENES[Math.max(0, Math.min(SCENES.length - 1, s.currentScene))]!

export type Pose = 'idle' | 'run' | 'attack'
export function actorPose(hero: Hero | null): Pose {
  if (!hero) return 'idle'
  return hero.strike > 0 ? 'attack' : hero.moveAmount > 0.15 ? 'run' : 'idle'
}
