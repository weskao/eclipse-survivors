import { describe, expect, it } from 'vitest'
import { ECLIPSE_SURVIVORS_FIREBASE, firebaseConfig } from './firebase-config'

describe('Firebase web config source', () => {
  it('ships the dedicated public project config, never another game', () => {
    const config = JSON.parse(ECLIPSE_SURVIVORS_FIREBASE) as Record<string, string>
    expect(config.projectId).toBe('eclipse-survivors-weskao')
    expect(config.authDomain).toBe('eclipse-survivors-weskao.firebaseapp.com')
    expect(config.apiKey).toMatch(/^AIza/)
    expect(config.appId).toMatch(/^1:\d+:web:/)
  })
  it('lets an explicit environment config override it (emulator QA)', () => {
    expect(firebaseConfig({ MODE: 'development', VITE_ES2_FIREBASE_CONFIG: '{"projectId":"demo-eclipse-survivors"}' }))
      .toBe('{"projectId":"demo-eclipse-survivors"}')
  })
  it('falls back to the shipped config in dev and production, including an empty CI variable', () => {
    expect(firebaseConfig({ MODE: 'development' })).toBe(ECLIPSE_SURVIVORS_FIREBASE)
    expect(firebaseConfig({ MODE: 'production', VITE_ES2_FIREBASE_CONFIG: '' })).toBe(ECLIPSE_SURVIVORS_FIREBASE)
  })
  it('keeps unit tests off the real project unless a config is given explicitly', () => {
    expect(firebaseConfig({ MODE: 'test' })).toBeUndefined()
  })
})
