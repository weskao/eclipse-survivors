import type { AccessibilityPreferences, QualitySetting } from './preferences'

export interface PresentationHints {
  prefersReducedMotion?: boolean
  deviceMemory?: number
  hardwareConcurrency?: number
}

export interface VisualPresentationPolicy {
  /** Presentation-only hints. Never pass these to simulation, enemy spawn or damage code. */
  quality: Exclude<QualitySetting, 'auto'>
  pixelRatioCap: number
  ambientDensity: number
  vfxOpacity: number
  reduceMotion: boolean
  reduceFlashing: boolean
  statusSymbols: boolean
  showDamageNumbers: boolean
}

export function resolvePresentationPolicy(
  p: Readonly<AccessibilityPreferences>, hints: Readonly<PresentationHints> = {},
): VisualPresentationPolicy {
  const quality = p.quality === 'auto'
    ? (hints.deviceMemory !== undefined && hints.deviceMemory <= 2) || (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 2)
      ? 'low' : (hints.deviceMemory !== undefined && hints.deviceMemory <= 4) || (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 4)
        ? 'medium' : 'high'
    : p.quality
  const parameters = {
    low: { pixelRatioCap: 1, ambientDensity: 0.35 },
    medium: { pixelRatioCap: 1.5, ambientDensity: 0.65 },
    high: { pixelRatioCap: 2, ambientDensity: 1 },
  } as const
  return {
    quality,
    ...parameters[quality],
    vfxOpacity: { off: 0, low: 0.35, medium: 0.7, full: 1 }[p.vfxIntensity],
    reduceMotion: p.reducedMotion === 'on' || (p.reducedMotion === 'system' && !!hints.prefersReducedMotion),
    reduceFlashing: p.reducedFlashing,
    statusSymbols: p.colorblindIndicators,
    showDamageNumbers: p.showDamageNumbers,
  }
}

/** Sets CSS-only UI hints on a root; the renderer must separately consume VisualPresentationPolicy. */
export function applyPresentation(
  root: HTMLElement, policy: Readonly<VisualPresentationPolicy>, p: Readonly<AccessibilityPreferences>,
): () => void {
  const attrs = {
    'data-es2-reduce-motion': String(policy.reduceMotion),
    'data-es2-reduce-flashing': String(policy.reduceFlashing),
    'data-es2-status-symbols': String(policy.statusSymbols),
    'data-es2-damage-numbers': String(policy.showDamageNumbers),
    'data-es2-quality': policy.quality,
  }
  const previous = Object.fromEntries(Object.keys(attrs).map(k => [k, root.getAttribute(k)])) as Record<string, string | null>
  const styleNames = ['--es2-ui-scale', '--es2-vfx-opacity']
  const oldStyles = styleNames.map(name => root.style.getPropertyValue(name))
  for (const [key, value] of Object.entries(attrs)) root.setAttribute(key, value)
  root.style.setProperty(styleNames[0]!, String(p.interfaceScale))
  root.style.setProperty(styleNames[1]!, String(policy.vfxOpacity))
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === null) root.removeAttribute(key)
      else root.setAttribute(key, value)
    }
    styleNames.forEach((name, index) => {
      if (oldStyles[index]) root.style.setProperty(name, oldStyles[index])
      else root.style.removeProperty(name)
    })
  }
}
