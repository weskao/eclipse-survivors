import type { HudSkill, HudView } from '../../../game/store'
import type { JobId, SkillRarity } from '../../../game/types'

export type CombatHudRarity = SkillRarity | 'epic'

/** Data unavailable in foundation UiState must be supplied by an integration adapter.
 * Omitted means unknown/not implemented, never a fabricated zero or fake announcement.
 * Callers own event expiration; this component creates no simulation timers.
 */
export interface CombatHudFeed {
  readonly boss?: { readonly name: string; readonly phase?: number; readonly totalPhases?: number }
  readonly wave?: { readonly number: number; readonly announcement?: string }
  readonly combo?: { readonly count: number }
  readonly relics?: readonly {
    readonly id: string; readonly title: string; readonly icon: string; readonly rarity: CombatHudRarity
    readonly iconSrc?: string
  }[]
  readonly statuses?: readonly {
    readonly id: string; readonly title: string; readonly kind: 'buff' | 'debuff'
    readonly icon?: string; readonly remainingSeconds?: number
  }[]
  readonly objectives?: readonly {
    readonly id: string; readonly title: string
    readonly progress?: number; readonly target?: number; readonly complete?: boolean
  }[]
  readonly notices?: readonly {
    readonly id: string; readonly kind: 'damage' | 'critical' | 'treasure' | 'message'
    readonly text: string
  }[]
}

export interface CombatHudActions {
  /** Required; controls never imply a working action without a real integration callback. */
  readonly pause: () => void
  readonly settings: () => void
  readonly toggleMusic?: () => void
  readonly toggleSfx?: () => void
}

export interface CombatHudView {
  readonly choice: JobId
  readonly identity: string
  readonly health: { readonly percent: number; readonly label: string }
  readonly experience: number
  readonly kills: number
  readonly timer: string
  readonly objective: string
  readonly boss: { readonly percent: number; readonly name: string; readonly phase?: number; readonly totalPhases?: number } | null
  readonly skills: readonly HudSkill[]
  readonly wave?: CombatHudFeed['wave']
  readonly combo?: CombatHudFeed['combo']
  readonly relics: NonNullable<CombatHudFeed['relics']>
  readonly statuses: NonNullable<CombatHudFeed['statuses']>
  readonly objectives: NonNullable<CombatHudFeed['objectives']>
  readonly notices: NonNullable<CombatHudFeed['notices']>
}

const percent = (n: number): number => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0

/** Pure, low-frequency (~8 Hz) projection, not a per-frame renderer or game-state mutation. */
export function projectCombatHud(hud: HudView, choice: JobId, feed: CombatHudFeed = {}): CombatHudView {
  return {
    choice,
    identity: hud.who,
    health: { percent: percent(hud.hpPct), label: hud.hpLabel },
    experience: percent(hud.xpPct),
    kills: hud.kill,
    timer: hud.timer,
    objective: hud.quest,
    boss: hud.bossPct === null ? null : {
      percent: percent(hud.bossPct),
      name: feed.boss?.name || '首領',
      phase: feed.boss?.phase,
      totalPhases: feed.boss?.totalPhases,
    },
    skills: hud.skills.map(skill => ({
      ...skill,
      cooldown: Number.isFinite(skill.cooldown) ? Math.max(0, skill.cooldown) : 0,
      cooldownPct: percent(skill.cooldownPct),
    })),
    wave: feed.wave,
    combo: feed.combo,
    relics: feed.relics ?? [],
    statuses: feed.statuses ?? [],
    objectives: feed.objectives ?? [],
    notices: feed.notices ?? [],
  }
}
