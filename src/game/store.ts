import type { GameMode, JobId, UpgradeDef, UpgradeId } from './types'
import type { Profile, RunModeId, RunRewards, RunStats, PermanentUpgrade, CosmeticId } from '../meta/types'

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
}

/** Reactive UI snapshot (engine owns it as a `shallowReactive`; replace nested objects, don't mutate). */
export interface UiState {
  mode: GameMode
  choice: JobId
  musicOn: boolean
  sfxOn: boolean
  hud: HudView
  upgrades: readonly UpgradeDef[]
  toastText: string
  toastVisible: boolean
  /** `#ending` / `#summary` text. */
  ending: string
  summary: string
  runMode: RunModeId
  profile: Profile
  runResult: RunStats | null
  rewards: RunRewards | null
  /** `(pointer:coarse)` matched: show touch controls while playing. */
  coarsePointer: boolean
}

export interface GameCommands {
  selectJob(job: JobId): void
  start(): void
  selectRunMode(mode: RunModeId): void
  buyPermanentUpgrade(upgrade: PermanentUpgrade): void
  selectCosmetic(hero: JobId, skin: CosmeticId): void
  resetProgress(): void
  chooseUpgrade(id: UpgradeId): void
  /** Original `pause()`: play → paused, paused → play. */
  togglePause(): void
  dash(): void
  toggleMusic(): void
  toggleSfx(): void
  /** `#home` / `#leave`: back to the menu. */
  goMenu(): void
  /** Joystick input in normalised units (see `stickVector`); `null` releases the stick. */
  setStick(v: { x: number; y: number } | null): void
}

export const emptyHud = (): HudView => ({
  who: '', hpPct: 100, hpLabel: '生命', xpPct: 0, kill: 0, timer: '00:00', bossPct: null, quest: '',
})
