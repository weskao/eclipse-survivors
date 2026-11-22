import { MAX_LEVEL, UP } from './constants'
import type { ContentRegistry } from './content/registry'
import type { Profile, RunModeId, RunRewards, RunStats, PermanentUpgrade, CosmeticId } from '../meta/types'
import { EVOLUTIONS, EVOLUTION_COOLDOWN } from './evolutions'
import type { AbilityId, GameMode, GameState, Hero, HeroId, JobId, SkillRarity, UpgradeDef, UpgradeId } from './types'
import type { SpecializationSnapshot } from './content/heroes'
import type { ObjectiveState } from './content/objectives/evaluator'
import type { ActiveWorldEvent } from './content/world-events/types'
import type { WorldEventOption } from './content/world-events/runtime'

export interface HudSkill {
  id: AbilityId; icon: string; title: string; rarity: SkillRarity
  level: number; maxLevel: number; cooldown: number; cooldownPct: number; evolved: boolean
  iconSrc?: string
}

/** Pure projection of actual equipped abilities, not five hard-coded icon slots. */
export function equippedSkillHud(hero: Hero, registry?: ContentRegistry, state?: GameState): HudSkill[] {
  const passive = UP.filter(u => (hero.skills[u.id] ?? 0) > 0).map(u => {
    const level = hero.skills[u.id] ?? 0
    const timers: Partial<Record<UpgradeId, [number, number]>> = {
      bolt: [hero.bolt, Math.max(0.45, 2 - level * 0.16)],
      frost: [hero.frostCd, Math.max(1.2, 5.4 - level * 0.45)],
      meteor: [hero.meteorCd, Math.max(1.8, 6 - level * 0.42)],
      blaze: [hero.blazeTick, Math.max(0.18, 0.48 - level * 0.03)],
      vortex: [hero.vortexCd, Math.max(2.2, 8 - level * 0.55)],
      shield: [hero.shieldPulse, Math.max(0.4, 2.8 - level * 0.18)],
      chain: [hero.chainCd, Math.max(0.5, 2.8 - level * 0.23)],
    }
    const timer = timers[u.id]
    const remaining = timer ? Math.max(0, timer[0]) : 0
    return {
      id: u.id, icon: u.icon, title: u.title, rarity: u.rarity, level, maxLevel: MAX_LEVEL[u.id],
      cooldown: remaining, cooldownPct: timer ? Math.min(100, remaining / timer[1] * 100) : 0,
      evolved: EVOLUTIONS.some(e => hero.evolutions[e.id] && e.requires.includes(u.id)),
    }
  })
  const evolved = EVOLUTIONS.filter(e => hero.evolutions[e.id]).map(e => {
    const remaining = Math.max(0, hero.evolutionCd[e.id] ?? 0)
    return {
      id: e.id, icon: e.icon, title: e.title, rarity: e.rarity, level: 1, maxLevel: 1,
      cooldown: remaining, cooldownPct: Math.min(100, remaining / EVOLUTION_COOLDOWN[e.id] * 100), evolved: true,
    }
  })
  const custom: HudSkill[] = registry && state ? registry.abilities.flatMap(a => {
    const level = state.content.levels[a.id] ?? 0
    if (!level) return []
    const cooldown = Math.max(0, state.content.cooldowns[a.id] ?? 0)
    const duration = a.cooldownSeconds ?? 0
    return [{ id: a.id, icon: a.icon, iconSrc: a.iconSrc, title: a.title, rarity: a.rarity, level, maxLevel: a.maxLevel,
      cooldown, cooldownPct: duration ? Math.min(100, cooldown / duration * 100) : 0, evolved: a.kind === 'evolution' }]
  }) : []
  return [...passive, ...evolved, ...custom]
}


/** Pre-formatted HUD text/percentages, rebuilt by the engine at the original 8 Hz `hud()` cadence. */
export interface HudView {
  /** `${JOB.label} · LV.${level}` */
  who: string
  /** 0..100 */
  hpPct: number
  /** `生命 ${ceil(hp)} / ${max}` */
  hpLabel: string
  /** 0..100 */
  xpPct: number
  kill: number
  /** `mm:ss` */
  timer: string
  /** 0..100 when a live boss exists, else null (hides `#bossWrap`). */
  bossPct: number | null
  quest: string
  /** All currently owned skills and evolutions, refreshed at the normal 8 Hz HUD cadence. */
  skills: HudSkill[]
}

export interface UiTreasureChoice {
  readonly kind: 'treasure'
  readonly items: readonly { id: string; title: string; description?: string; icon?: string;
    rarity: SkillRarity | 'epic' }[]
}

/** Reactive UI snapshot (engine owns it as a `shallowReactive`; replace nested objects, don't mutate). */
export interface UiState {
  mode: GameMode
  choice: JobId
  heroId: HeroId
  heroSpecial: SpecializationSnapshot | null
  musicOn: boolean
  /** Has a user gesture unlocked browser audio playback? */
  audioUnlocked: boolean
  sfxOn: boolean
  musicVolume: number
  sfxVolume: number
  settingsOpen: boolean
  upgradeEffect: 'soft' | 'still'
  cameraShake: boolean
  hud: HudView
  upgrades: readonly UpgradeDef[]
  specialChoice: UiTreasureChoice | null
  toastText: string
  toastVisible: boolean
  /** `#ending` / `#summary` text. */
  ending: string
  summary: string
  runMode: RunModeId
  /** Only actual objective-runtime evidence; null for original four modes. */
  objectiveProgress: ObjectiveState | null
  worldEventMarkers: readonly ActiveWorldEvent[]
  worldEventChoice: { event: ActiveWorldEvent; options: readonly WorldEventOption[]; feedback: string | null } | null
  profile: Profile
  runResult: RunStats | null
  rewards: RunRewards | null
  /** `(pointer:coarse)` matched: show touch controls while playing. */
  coarsePointer: boolean
}

export interface GameCommands {
  selectJob(job: JobId): void
  selectHero(hero: HeroId): void
  activateHeroSpecial(): boolean
  start(): void
  openWorldEvent(id: string): boolean
  chooseWorldEvent(eventId: string, choiceId: string): void
  closeWorldEvent(): void
  selectRunMode(mode: RunModeId): void
  buyPermanentUpgrade(upgrade: PermanentUpgrade): void
  selectCosmetic(hero: JobId, skin: CosmeticId): void
  resetProgress(): void
  chooseUpgrade(id: AbilityId): void
  chooseTreasure(id: string): void
  cancelTreasure(): void
  /** Original `pause()`: play → paused, paused → play. */
  togglePause(): void
  dash(): void
  enableMenuAudio(): void
  toggleMusic(): void
  toggleSfx(): void
  setMusicVolume(value: number): void
  setSfxVolume(value: number): void
  setUpgradeEffect(effect: 'soft' | 'still'): void
  setCameraShake(enabled: boolean): void
  openSettings(): void
  closeSettings(): void
  /** `#home` / `#leave`: back to the menu. */
  goMenu(): void
  /** Joystick input in normalised units (see `stickVector`); `null` releases the stick. */
  setStick(v: { x: number; y: number } | null): void
}

export const emptyHud = (): HudView => ({
  who: '', hpPct: 100, hpLabel: '生命', xpPct: 0, kill: 0, timer: '00:00', bossPct: null, quest: '', skills: [],
})
