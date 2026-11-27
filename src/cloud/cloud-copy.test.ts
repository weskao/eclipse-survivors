import { describe, expect, it } from 'vitest'
import { getLocale, setLocale, t } from '../i18n'
describe('cloud account bilingual copy', () => {
  it('translates the new account and wallet states', () => {
    const before = getLocale()
    try {
      setLocale('en')
      expect(t('使用 Google 登入')).toBe('Sign in with Google')
      expect(t('暮光餘燼已同步')).toBe('Twilight Embers synced')
      expect(t('雲端餘燼已在其他裝置變更')).toBe('Cloud balance changed on another device')
      setLocale('zh-TW')
      expect(t('使用 Google 登入')).toBe('使用 Google 登入')
    } finally { setLocale(before) }
  })
})
