import { MAX_LEVEL, UP } from './constants'
import { EVOLUTIONS, EVOLUTION_COOLDOWN } from './evolutions'
import type { AbilityId, GameMode, Hero, JobId, SkillRarity, UpgradeDef, UpgradeId } from './types'

export interface HudSkill {
  id: AbilityId; icon: string; title: string; rarity: SkillRarity
  level: number; maxLevel: number; cooldown: number; cooldownPct: number; evolved: boolean
}

/** Pure projection of actual equipped abilities, not five hard-coded icon slots. */
export function equippedSkillHud(hero: Hero): HudSkill[] {
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
  return [...passive, ...evolved]
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
  /** `(pointer:coarse)` matched: show touch controls while playing. */
  coarsePointer: boolean
}

export interface GameCommands {
  selectJob(job: JobId): void
  start(): void
  chooseUpgrade(id: AbilityId): void
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
  who: '', hpPct: 100, hpLabel: '生命', xpPct: 0, kill: 0, timer: '00:00', bossPct: null, quest: '', skills: [],
})
