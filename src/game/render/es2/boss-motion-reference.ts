import type { BossSnapshot } from '../../content/bosses/controller'
import type { BossId } from '../../content/bosses/definitions'
import type { Ctx2D } from '../ctx'
import { bossPhaseVisualScale } from './production-world'

type SourceRect = readonly [left: number, top: number, right: number, bottom: number]
type Reference = { readonly source: 'imgs7.png' | 'imgs8.png'; readonly phases: readonly (readonly SourceRect[])[] }

// Original 1448x1086 concept-sheet pose pixels, not newly authored native-3x art.
// The ranges were visually inspected and extracted without enlarging the source.
const rows = (xs: readonly (readonly [number, number])[], y: readonly [number, number]): SourceRect[] =>
  xs.map(([left, right]) => [left, y[0], right, y[1]])
const casterXs = [
  [[427,478],[478,530],[530,581],[581,632],[632,684],[684,735]],
  [[766,818],[818,869],[869,920],[920,972],[972,1023],[1023,1075]],
  [[1095,1147],[1147,1198],[1198,1250],[1250,1301],[1301,1352],[1363,1414]],
] as const
const titanXs = [[29,108],[111,190],[276,355],[356,436],[521,600],[603,682]] as const
const seraphXs = [[29,106],[104,182],[256,333],[336,413],[502,580],[584,661]] as const

export const BOSS_MOTION_REFERENCES: Readonly<Record<BossId, Reference>> = {
  'abyss-monarch': { source: 'imgs7.png', phases: casterXs.map(x => rows(x, [323,381])) },
  'frost-sovereign': { source: 'imgs7.png', phases: casterXs.map(x => rows(x, [848,909])) },
  'infernal-titan': { source: 'imgs8.png', phases: ([[328,389],[392,458],[463,533]] as const).map(y => rows(titanXs, y)) },
  'eclipse-seraph': { source: 'imgs8.png', phases: ([[848,914],[918,985],[990,1063]] as const).map(y => rows(seraphXs, y)) },
}
const clamp = (n: number): number => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0))

/** Drive QA pose playback from the real combat clock, never a separate animation timer. */
export function sampleBossAttackReference(snapshot: BossSnapshot): SourceRect | null {
  if (!snapshot.id || !snapshot.phase) return null
  const row = BOSS_MOTION_REFERENCES[snapshot.id].phases[snapshot.phase - 1]
  if (!row) return null
  const warning = snapshot.telegraphs.find(t => t.stage === 'warning')
  if (warning) return row[Math.min(2, Math.floor(clamp(warning.progress ?? 0) * 3))] ?? null
  const impact = snapshot.impacts?.[snapshot.impacts.length - 1]
  if (impact && impact.max > 0) {
    const progress = clamp(1 - impact.life / impact.max)
    return row[3 + Math.min(2, Math.floor(progress * 3))] ?? null
  }
  return null
}

/** DEV review only. Preserve aspect ratio and phase size; keep static fallback for unavailable art. */
export function drawBossAttackReference(ctx: Ctx2D, image: HTMLImageElement, snapshot: BossSnapshot,
  displaySize: number, reducedMotion = false): boolean {
  if (reducedMotion || !image.complete || image.naturalWidth !== 1448 || image.naturalHeight !== 1086
      || !Number.isFinite(displaySize) || displaySize <= 0 || !snapshot.phase) return false
  const rect = sampleBossAttackReference(snapshot)
  if (!rect) return false
  const [x, y, right, bottom] = rect
  const sw = right - x, sh = bottom - y
  const ratio = displaySize * bossPhaseVisualScale(snapshot.phase) / Math.max(sw, sh)
  const w = sw * ratio, h = sh * ratio
  ctx.drawImage(image, x, y, sw, sh, -w / 2, 4 - h, w, h)
  return true
}
