import type { HudSkill, HudView } from '../../../game/store'
import type { BossPointer } from './boss-pointer'
import type { JobId, SkillRarity } from '../../../game/types'

export type CombatHudRarity = SkillRarity | 'epic'

/** Identity of a real engine HUD snapshot. The host increments sequence once per HUD refresh,
 * and changes runId on each new run. Never derive this from wall-clock time.
 */
export interface CombatHudSnapshot {
  readonly runId: string
  readonly sequence: number
}

/** Optional live gameplay data. Missing properties are UNKNOWN, not zero or demo data.
 * The runtime owns notice IDs and expiration; the component never polls the game.
 */
export interface CombatHudFeed {
  readonly snapshot?: CombatHudSnapshot
  readonly boss?: { readonly name: string; readonly phase?: number; readonly totalPhases?: number; readonly offscreen?: BossPointer }
  readonly wave?: { readonly number: number; readonly announcement?: string; readonly progressPct?: number }
  readonly combo?: { readonly count: number }
  readonly relics?: readonly {
    readonly id: string; readonly title: string; readonly icon: string; readonly rarity: CombatHudRarity
    readonly iconSrc?: string; readonly stacks?: number
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
  readonly pause: () => void
  readonly settings: () => void
  readonly home?: () => void
  readonly toggleMusic?: () => void
  readonly toggleSfx?: () => void
  readonly setMusicVolume?: (value: number) => void
  readonly setSfxVolume?: (value: number) => void
}

export interface CombatHudView {
  readonly choice: JobId
  readonly identity: string
  readonly health: { readonly percent: number; readonly label: string }
  readonly experience: number
  readonly kills: number
  readonly timer: string
  readonly objective: string
  readonly boss: { readonly percent: number; readonly name: string; readonly phase?: number; readonly totalPhases?: number; readonly offscreen?: BossPointer } | null
  readonly skills: readonly HudSkill[]
  readonly wave?: CombatHudFeed['wave']
  readonly combo?: CombatHudFeed['combo']
  readonly relics: NonNullable<CombatHudFeed['relics']>
  readonly statuses: NonNullable<CombatHudFeed['statuses']>
  readonly objectives: NonNullable<CombatHudFeed['objectives']>
  readonly notices: NonNullable<CombatHudFeed['notices']>
}

export const MAX_HUD_NOTICES = 4
const MAX_RELICS = 10
const MAX_STATUSES = 12
const MAX_OBJECTIVES = 8
const percent = (n: number): number => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
const validCount = (n: number): boolean => Number.isSafeInteger(n) && n > 0

/** Read at the existing engine HUD cadence (~8 Hz). No timers, caches, or shared mutation. */
export function projectCombatHud(
  hud: HudView, choice: JobId, feed: CombatHudFeed = {}, expectedSnapshot?: CombatHudSnapshot,
): CombatHudView {
  // A stale or unauthenticated feed cannot persist across runs/screens when the host supplies a snapshot key.
  const live: CombatHudFeed = !expectedSnapshot || (feed.snapshot?.runId === expectedSnapshot.runId &&
    feed.snapshot.sequence === expectedSnapshot.sequence) ? feed : {}
  const bossPhase = live.boss?.phase
  const bossTotal = live.boss?.totalPhases
  const totalPhases = bossTotal !== undefined && validCount(bossTotal) ? bossTotal : undefined
  const phase = bossPhase !== undefined && validCount(bossPhase) && (!totalPhases || bossPhase <= totalPhases)
    ? bossPhase : undefined
  const notices: NonNullable<CombatHudFeed['notices']>[number][] = []
  const seen = new Set<string>()
  const sourceNotices = live.notices ?? []
  for (let i = sourceNotices.length - 1; i >= 0 && notices.length < MAX_HUD_NOTICES; i--) {
    const notice = sourceNotices[i]!
    if (!notice.id || !notice.text.trim() || seen.has(notice.id)) continue
    seen.add(notice.id)
    notices.push(notice)
  }
  notices.reverse()

  return {
    choice,
    identity: hud.who,
    health: { percent: percent(hud.hpPct), label: hud.hpLabel },
    experience: percent(hud.xpPct),
    kills: Number.isSafeInteger(hud.kill) && hud.kill >= 0 ? hud.kill : 0,
    timer: hud.timer,
    objective: hud.quest,
    boss: hud.bossPct === null ? null : {
      percent: percent(hud.bossPct),
      name: live.boss?.name?.trim() || '首領',
      phase,
      totalPhases,
      ...(live.boss?.offscreen ? { offscreen: live.boss.offscreen } : {}),
    },
    skills: hud.skills.map(skill => ({
      ...skill,
      cooldown: Number.isFinite(skill.cooldown) ? Math.max(0, skill.cooldown) : 0,
      cooldownPct: percent(skill.cooldownPct),
    })),
    wave: live.wave && validCount(live.wave.number) ? { ...live.wave,
      ...(live.wave.progressPct !== undefined ? { progressPct: percent(live.wave.progressPct) } : {}) } : undefined,
    combo: live.combo && Number.isSafeInteger(live.combo.count) && live.combo.count > 1 ? live.combo : undefined,
    relics: (live.relics ?? []).filter(relic => relic.id && relic.title).slice(0, MAX_RELICS),
    statuses: (live.statuses ?? []).filter(status =>
      status.id && status.title && (status.remainingSeconds === undefined ||
        (Number.isFinite(status.remainingSeconds) && status.remainingSeconds > 0))).slice(0, MAX_STATUSES),
    objectives: (live.objectives ?? []).filter(item => item.id && item.title).slice(0, MAX_OBJECTIVES),
    notices,
  }
}
