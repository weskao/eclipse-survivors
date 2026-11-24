import { afterEach, describe, expect, it } from 'vitest'
import { setLocale, t } from '../../../i18n'
import { heroMasteryPreview, HERO_MASTERY_DESCRIPTIONS } from './mastery-preview'

const rows = (id: string, level?: number, max = 3) =>
  heroMasteryPreview(id, level, max)?.map(({ before, after }) => [before, after])
const storage = { getItem: () => null, setItem: () => {} }
afterEach(() => setLocale('zh-TW', storage))

describe('hero mastery upgrade preview', () => {
  it('compares critical multiplier and active damage at the first rank', () => {
    expect(rows('heroes:shadow-precision', 0)).toEqual([['170%', '188%'], ['140%', '144.5%']])
  })
  it('compares companion damage, healing and active damage at the second rank', () => {
    expect(rows('heroes:spirit-bond', 1)).toEqual([['120%', '140%'], ['3.15', '4.3'], ['142%', '164%']])
  })
  it('shows capped mitigation and all other third-rank bonuses', () => {
    expect(rows('heroes:crimson-vow', 2)).toEqual([['19%', '21.5%'], ['97%', '110.5%'], ['149%', '156%'], ['+28', '+42']])
  })
  it('does not claim an upgrade for maxed, unknown or missing ranks', () => {
    expect(rows('heroes:crimson-vow', 3)).toBeUndefined()
    expect(rows('bolt', 0)).toBeUndefined()
    expect(rows('heroes:shadow-precision')).toBeUndefined()
    expect(rows('heroes:shadow-precision', -1)).toBeUndefined()
    expect(rows('heroes:shadow-precision', 1, 1)).toBeUndefined()
  })
  it('localizes every label and effect in both languages', () => {
    const labels = [
      ...Object.values(HERO_MASTERY_DESCRIPTIONS),
      ...['heroes:shadow-precision', 'heroes:spirit-bond', 'heroes:crimson-vow']
        .flatMap(id => heroMasteryPreview(id, 0, 3)!.map(row => row.label)),
    ]
    setLocale('en', storage)
    for (const label of labels) expect(t(label)).not.toMatch(/[\u3400-\u9fff]/)
    setLocale('zh-TW', storage)
    for (const label of labels) expect(t(label)).toBe(label)
  })
})
