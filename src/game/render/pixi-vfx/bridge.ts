import type { Ctx2D } from '../ctx'
import type { BossSnapshot } from '../../content/bosses/controller'
import type { VisualPresentationPolicy } from '../../content/accessibility/presentation'
import type { PixiBossRenderer } from './renderer'

export interface VfxFrame {
  ctx: Ctx2D; snapshot: BossSnapshot; ox: number; oy: number; width: number; height: number; dpr: number
  reduced: boolean; policy?: VisualPresentationPolicy | null
}
export interface PixiVfxBridge {
  projectiles(frame: VfxFrame): boolean
  impacts(frame: VfxFrame): boolean
  dispose(): void
}
/** Lazy initialize only when an actual encounter needs VFX. No independent frame loop. */
export function createPixiVfxBridge(): PixiVfxBridge {
  let renderer: PixiBossRenderer | undefined
  let loading = false, failed = false, disposed = false
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
    if (!renderer) { ensure(); return false }
    try { return renderer[kind](frame) }
    catch {
      failed = true
      renderer.dispose()
      renderer = undefined
      return false
    }
  }
  return { projectiles: frame => draw(frame, 'projectiles'), impacts: frame => draw(frame, 'impacts'),
    dispose() { disposed = true; renderer?.dispose(); renderer = undefined } }
}
