import { describe, expect, it } from 'vitest'
import { abilityChoiceId, formatDuration, nextIndex, shortcutIndex, upgradeCost } from './model'

describe('ES2 menu state helpers', () => {
  const key = (value: string, flags = {}) => ({
    key: value, code: /^[0-9]$/.test(value) ? `Digit${value}` : 'KeyA',
    repeat: false, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, ...flags,
  })

  it('accepts only one-time, unmodified 1–9 shortcuts within the active choices', () => {
    expect(shortcutIndex(key('1'), 3)).toBe(0)
    expect(shortcutIndex(key('3'), 3)).toBe(2)
    expect(shortcutIndex(key('4'), 3)).toBe(-1)
    expect(shortcutIndex(key('0'), 3)).toBe(-1)
    expect(shortcutIndex(key('1', { repeat: true }), 3)).toBe(-1)
    expect(shortcutIndex(key('1', { ctrlKey: true }), 3)).toBe(-1)
    expect(shortcutIndex(key('Process', { code: 'Digit1', isComposing: true }), 3)).toBe(0)
    expect(shortcutIndex(key('ㄅ', { code: 'Numpad3', isComposing: true }), 3)).toBe(2)
    expect(shortcutIndex(key('2', { code: 'KeyQ' }), 3)).toBe(-1)
    expect(shortcutIndex(key('9', { code: 'Digit9' }), 9)).toBe(8)
    expect(shortcutIndex(key('9', { code: 'Numpad9' }), 9)).toBe(8)
    expect(shortcutIndex(key('3', { altKey: true }), 3)).toBe(-1)
  })

  it('wraps roving keyboard focus and handles empty lists safely', () => {
    expect(nextIndex(2, 1, 3)).toBe(0)
    expect(nextIndex(0, -1, 3)).toBe(2)
    expect(nextIndex(0, 1, 0)).toBe(-1)
  })

  it('formats duration defensively and keeps permanent upgrade pricing in sync', () => {
    expect(formatDuration(125.9)).toBe('02:05')
    expect(formatDuration(-2)).toBe('00:00')
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('00:00')
    expect(upgradeCost(0)).toBe(25)
    expect(upgradeCost(2)).toBe(75)
  })

  it('never forwards an arbitrary string to the engine upgrade handler', () => {
    const upgrades = [{ id: 'bolt' as const }, { id: 'arcane:chain-bolt' as const }]
    expect(abilityChoiceId('arcane:chain-bolt', upgrades)).toBe('arcane:chain-bolt')
    expect(abilityChoiceId('unknown', upgrades)).toBeNull()
  })
})
