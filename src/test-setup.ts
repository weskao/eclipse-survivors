import { beforeEach } from 'vitest'
import { LOCALE_STORAGE_KEY, setLocale } from './i18n'

// Existing UI snapshots assert the Chinese catalog; production still uses the browser locale.
// Reset a deterministic language before each test without creating a persisted user choice.
beforeEach(() => {
  try { localStorage.removeItem(LOCALE_STORAGE_KEY) } catch { /* isolated storage may be disabled */ }
  setLocale('zh-TW', { getItem: () => null, setItem: () => {} })
})
