import { afterEach, describe, expect, it } from 'vitest'
import { setLocale, t } from './i18n'

const storage = { getItem: () => null, setItem: () => {} }
afterEach(() => setLocale('zh-TW', storage))

describe('bilingual composed game copy', () => {
  it('localizes a live expedition summary with named values and natural word order', () => {
    setLocale('en', storage)
    expect(t('存活 {seconds} 秒 · 擊敗 {kills} 隻魔物 · 等級 {level}', {
      seconds: 68, kills: 12, level: 4,
    })).toBe('Survived 68s · Defeated 12 enemies · Lv.4')
    setLocale('zh-TW', storage)
    expect(t('存活 {seconds} 秒 · 擊敗 {kills} 隻魔物 · 等級 {level}', {
      seconds: 68, kills: 12, level: 4,
    })).toBe('存活 68 秒 · 擊敗 12 隻魔物 · 等級 4')
  })

  it('translates mixed-language art labels and dynamic hero names into Traditional Chinese', () => {
    setLocale('zh-TW', storage)
    expect(t('Shadow Assassin 攻擊預警示意')).toBe('暗影刺客 攻擊預警示意')
    expect(t('Dawnsteel Knight · LV.9')).toBe('曙鋼騎士 · LV.9')
    expect(t('Echo Gem 插畫')).toBe('迴聲寶石 插畫')
    expect(t('Timekeeper')).toBe('Timekeeper')
  })

  it('localizes the decorative main-menu scene accessible description', () => {
    setLocale('en', storage)
    expect(t('日蝕高懸於古老的廢墟戰場上')).toBe('A radiant eclipse hangs over an ancient ruined battlefield')
    setLocale('zh-TW', storage)
    expect(t('日蝕高懸於古老的廢墟戰場上')).toBe('日蝕高懸於古老的廢墟戰場上')
  })

  it('uses English punctuation for a dynamic relic notification', () => {
    setLocale('en', storage)
    expect(t('✦ 已獲得聖物：迴聲寶石')).toBe('✦ Relic obtained: Echo Gem')
  })

  it('does not replace player values that happen to resemble translation keys', () => {
    setLocale('en', storage)
    expect(t('存活 {seconds} 秒 · 擊敗 {kills} 隻魔物 · 等級 {level}', {
      seconds: 12, kills: '勝利', level: 5,
    })).toBe('Survived 12s · Defeated 勝利 enemies · Lv.5')
  })
})
