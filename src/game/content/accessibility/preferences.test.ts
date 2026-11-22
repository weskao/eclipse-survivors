import { describe, expect, it, vi } from 'vitest'
import { ACCESSIBILITY_STORAGE_KEY, DEFAULT_ACCESSIBILITY_PREFERENCES, loadAccessibilityPreferences, saveAccessibilityPreferences, updateAccessibilityPreferences } from './preferences'
import { applyPresentation, resolvePresentationPolicy } from './presentation'

describe('accessibility preferences', () => {
  it('keeps legacy behavior by default and safely ignores corrupt storage', () => {
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.quality).toBe('auto')
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.showDamageNumbers).toBe(true)
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.joystickSide).toBe('left')
    const broken = { getItem: () => '{broken', setItem: vi.fn() }
    expect(loadAccessibilityPreferences(broken)).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES)
    expect(loadAccessibilityPreferences({ getItem: () => { throw Error('private mode') }, setItem: vi.fn() })).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES)
  })

  it('validates stored keys, bounds and invalid values without changing the profile save', () => {
    const storage = { getItem: () => JSON.stringify({ quality: 'ultra', joystickSide: 'right', touchScale: 99, interfaceScale: -2, joystickBottom: 87, showDamageNumbers: false, damage: 500 }), setItem: vi.fn() }
    const prefs = loadAccessibilityPreferences(storage)
    expect(prefs).toMatchObject({ quality: 'auto', joystickSide: 'right', touchScale: 1.35, interfaceScale: 0.85, joystickBottom: 87, showDamageNumbers: false })
    expect('damage' in prefs).toBe(false)
    saveAccessibilityPreferences(storage, prefs)
    expect(storage.setItem).toHaveBeenCalledWith(ACCESSIBILITY_STORAGE_KEY, expect.any(String))
    expect(JSON.parse(storage.setItem.mock.calls[0]![1])).not.toHaveProperty('damage')
    expect(() => saveAccessibilityPreferences({ getItem: () => null, setItem: () => { throw Error('quota') } }, prefs)).not.toThrow()
  })

  it('updates individual settings immediately while retaining all others', () => {
    const prefs = updateAccessibilityPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES, { joystickSide: 'right', touchScale: 1.25, quality: 'low' })
    expect(prefs.joystickSide).toBe('right')
    expect(prefs.touchScale).toBe(1.25)
    expect(prefs.quality).toBe('low')
    expect(prefs.showDamageNumbers).toBe(true)
  })
})

describe('visual presentation only', () => {
  it('keeps simulation-independent policies for all quality presets', () => {
    const values = (['low', 'medium', 'high', 'auto'] as const).map(quality => resolvePresentationPolicy(
      { ...DEFAULT_ACCESSIBILITY_PREFERENCES, quality }, { deviceMemory: 8, hardwareConcurrency: 8 },
    ))
    expect(values.map(v => v.quality)).toEqual(['low', 'medium', 'high', 'high'])
    expect(values.map(v => v.ambientDensity)).toEqual([0.35, 0.65, 1, 1])
    expect(values.map(v => v.pixelRatioCap)).toEqual([1, 1.5, 2, 2])
    for (const value of values) {
      expect(value).not.toHaveProperty('damage')
      expect(value).not.toHaveProperty('enemyCount')
      expect(value).not.toHaveProperty('simulation')
      expect(value.showDamageNumbers).toBe(true)
    }
  })

  it('uses system reduced motion, flashing and colorblind-independent symbols', () => {
    const p = { ...DEFAULT_ACCESSIBILITY_PREFERENCES, reducedMotion: 'system' as const, reducedFlashing: true, colorblindIndicators: true, vfxIntensity: 'low' as const }
    const policy = resolvePresentationPolicy(p, { prefersReducedMotion: true, deviceMemory: 2 })
    expect(policy).toMatchObject({ quality: 'low', reduceMotion: true, reduceFlashing: true, statusSymbols: true, vfxOpacity: 0.35 })
    const el = document.createElement('div')
    const dispose = applyPresentation(el, policy, p)
    expect(el.dataset.es2ReduceMotion).toBe('true')
    expect(el.style.getPropertyValue('--es2-ui-scale')).toBe('1')
    dispose()
    expect(el.dataset.es2ReduceMotion).toBeUndefined()
  })
})
