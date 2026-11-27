import { expect, it } from 'vitest'
import { accountStorage } from './account-storage'
it('isolates guest and different Google accounts', () => {
  const map = new Map<string, string>()
  const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v) }, removeItem: (k: string) => { map.delete(k) } } as Storage
  storage.setItem('wallet', 'guest')
  const a = accountStorage(storage, 'a'), b = accountStorage(storage, 'b')
  a.setItem('wallet', 'first')
  expect(b.getItem('wallet')).toBeNull()
  expect(storage.getItem('wallet')).toBe('guest')
  expect(a.getItem('wallet')).toBe('first')
  b.setItem('wallet', 'second')
  a.removeItem('wallet')
  expect(b.getItem('wallet')).toBe('second')
})
