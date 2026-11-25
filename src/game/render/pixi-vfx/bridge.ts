import type { Ctx2D } from '../ctx'
import type { BossSnapshot } from '../../content/bosses/controller'
import type { VisualPresentationPolicy } from '../../content/accessibility/presentation'
import type { PixiBossRenderer } from './renderer'

export interface VfxFrame {
  ctx: Ctx2D; snapshot: BossSnapshot; ox: number; oy: number; width: number; height: number; dpr: number
  reduced: boolean; policy?: VisualPresentationPolicy | null
}
export interface PixiVfxStats { status: 'idle' | 'loading' | 'ready' | 'fallback' | 'disposed'; projectilePasses: number; releasePasses: number; fallbackPasses: number; attackIds: readonly string[] }
export interface PixiVfxBridge {
  stats(): PixiVfxStats
  projectiles(frame: VfxFrame): boolean
  impacts(frame: VfxFrame): boolean
  dispose(): void
}
/** Lazy initialize only when an actual encounter needs VFX. No independent frame loop. */
export function createPixiVfxBridge(): PixiVfxBridge {
  let renderer: PixiBossRenderer | undefined
  let loading = false, failed = false, disposed = false
  let projectilePasses = 0, releasePasses = 0, fallbackPasses = 0
  const attackIds = new Set<string>()
  const ensure = () => {
    if (loading || failed || disposed || renderer) return
    loading = true
    void import('./renderer').then(m => m.createPixiBossRenderer()).then(value => {
      if (disposed) value.dispose()
      else renderer = value
    }).catch(() => { failed = true }).finally(() => { loading = false })
  }
  const draw = (frame: VfxFrame, kind: 'projectiles' | 'impacts'): boolean => {
    if (disposed || failed || !frame.snapshot.id) return false
    const active = kind === 'projectiles' ? (frame.snapshot.projectiles.length > 0 || frame.snapshot.telegraphs.length > 0) : !!frame.snapshot.impacts?.length && frame.policy?.vfxOpacity !== 0
    if (!renderer) { ensure(); if (active) fallbackPasses++; return false }
    try {
      const painted = renderer[kind](frame)
      if (painted && active) {
        if (kind === 'projectiles') projectilePasses++
        else {
          releasePasses++
          for (const id of renderer.lastReleaseIds()) attackIds.add(id)
        }
      } else if (active) fallbackPasses++
      return painted
    }
    catch {
      failed = true
      if (active) fallbackPasses++
      renderer.dispose()
      renderer = undefined
      return false
    }
  }
  return { projectiles: frame => draw(frame, 'projectiles'), impacts: frame => draw(frame, 'impacts'),
    stats: () => ({ status: disposed ? 'disposed' : failed ? 'fallback' : renderer ? 'ready' : loading ? 'loading' : 'idle', projectilePasses, releasePasses, fallbackPasses, attackIds: [...attackIds] }),
    dispose() { disposed = true; renderer?.dispose(); renderer = undefined } }
}
