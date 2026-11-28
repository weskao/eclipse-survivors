/** An isolated preferences namespace. Never mutate the legacy profile or simulation state. */
export const ACCESSIBILITY_STORAGE_KEY = 'eclipse-survivors.accessibility.v1'

export type QualitySetting = 'auto' | 'low' | 'medium' | 'high'
export type MotionSetting = 'system' | 'on' | 'off'
export type VfxIntensity = 'off' | 'low' | 'medium' | 'full'

export interface AccessibilityPreferences {
  joystickSide: 'left' | 'right'
  /** Distance of the bottom of the controls above the safe area, in CSS px. */
  joystickBottom: number
  touchScale: number
  interfaceScale: number
  quality: QualitySetting
  reducedMotion: MotionSetting
  haptics: boolean
  reducedFlashing: boolean
  colorblindIndicators: boolean
  vfxIntensity: VfxIntensity
  showDamageNumbers: boolean
  showFullEnemyHealthBars: boolean
  showHeroLowHealthWarning: boolean
  /** Remembered "skip reveal" checkbox on treasure/evolution pickers. */
  skipRewardReveal: boolean
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: Readonly<AccessibilityPreferences> = Object.freeze({
  joystickSide: 'left',
  joystickBottom: 30,
  touchScale: 1,
  interfaceScale: 1,
  quality: 'auto',
  reducedMotion: 'system',
  haptics: false,
  reducedFlashing: false,
  colorblindIndicators: false,
  vfxIntensity: 'full',
  showDamageNumbers: true,
  showFullEnemyHealthBars: false,
  showHeroLowHealthWarning: true,
  skipRewardReveal: false,
})

export interface PreferencesStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function storageOrNull(): PreferencesStorage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

const choice = <T extends string>(value: unknown, values: readonly T[], fallback: T): T =>
  typeof value === 'string' && values.includes(value as T) ? value as T : fallback

const bounded = (value: unknown, fallback: number, lo: number, hi: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(lo, Math.min(hi, value)) : fallback

/** Whitelist persisted keys and clamp all user-configurable geometry. */
export function normalizeAccessibilityPreferences(value: unknown): AccessibilityPreferences {
  const p: Partial<AccessibilityPreferences> = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<AccessibilityPreferences> : {}
  const d = DEFAULT_ACCESSIBILITY_PREFERENCES
  return {
    joystickSide: choice(p.joystickSide, ['left', 'right'], d.joystickSide),
    joystickBottom: bounded(p.joystickBottom, d.joystickBottom, 0, 120),
    touchScale: bounded(p.touchScale, d.touchScale, 0.85, 1.35),
    interfaceScale: bounded(p.interfaceScale, d.interfaceScale, 0.85, 1.25),
    quality: choice(p.quality, ['auto', 'low', 'medium', 'high'], d.quality),
    reducedMotion: choice(p.reducedMotion, ['system', 'on', 'off'], d.reducedMotion),
    haptics: typeof p.haptics === 'boolean' ? p.haptics : d.haptics,
    reducedFlashing: typeof p.reducedFlashing === 'boolean' ? p.reducedFlashing : d.reducedFlashing,
    colorblindIndicators: typeof p.colorblindIndicators === 'boolean' ? p.colorblindIndicators : d.colorblindIndicators,
    vfxIntensity: choice(p.vfxIntensity, ['off', 'low', 'medium', 'full'], d.vfxIntensity),
    showDamageNumbers: typeof p.showDamageNumbers === 'boolean' ? p.showDamageNumbers : d.showDamageNumbers,
    showFullEnemyHealthBars: typeof p.showFullEnemyHealthBars === 'boolean' ? p.showFullEnemyHealthBars : d.showFullEnemyHealthBars,
    showHeroLowHealthWarning: typeof p.showHeroLowHealthWarning === 'boolean' ? p.showHeroLowHealthWarning : d.showHeroLowHealthWarning,
    skipRewardReveal: typeof p.skipRewardReveal === 'boolean' ? p.skipRewardReveal : d.skipRewardReveal,
  }
}

export function loadAccessibilityPreferences(storage: PreferencesStorage | null = storageOrNull()): AccessibilityPreferences {
  try {
    const raw = storage?.getItem(ACCESSIBILITY_STORAGE_KEY)
    return raw ? normalizeAccessibilityPreferences(JSON.parse(raw) as unknown) : { ...DEFAULT_ACCESSIBILITY_PREFERENCES }
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES }
  }
}

export function saveAccessibilityPreferences(
  storage: PreferencesStorage | null = storageOrNull(), preferences: AccessibilityPreferences,
): void {
  try { storage?.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(normalizeAccessibilityPreferences(preferences))) }
  catch { /* Safari private mode / disabled storage: the in-memory preference remains usable. */ }
}

export function updateAccessibilityPreferences(
  current: AccessibilityPreferences, changes: Partial<AccessibilityPreferences>,
): AccessibilityPreferences {
  return normalizeAccessibilityPreferences({ ...current, ...changes })
}

/** Integration owner holds the returned object in Vue reactive()/ref(); UI updates are synchronous. */
export function createAccessibilityPreferencesController(storage: PreferencesStorage | null = storageOrNull()) {
  let current = loadAccessibilityPreferences(storage)
  return {
    get current(): AccessibilityPreferences { return current },
    update(changes: Partial<AccessibilityPreferences>): AccessibilityPreferences {
      current = updateAccessibilityPreferences(current, changes)
      saveAccessibilityPreferences(storage, current)
      return current
    },
  }
}
