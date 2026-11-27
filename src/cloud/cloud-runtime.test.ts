import { describe, expect, it } from 'vitest'
import { resolveCloudRuntime } from './cloud-runtime'
const live = JSON.stringify({ apiKey: 'live', authDomain: 'es.example.test', projectId: 'real-es', appId: 'live' })
const defaults = { dev: true, emulator: false, unlocked: false, hostname: '127.0.0.1', config: live }
describe('Skyline-style development cloud isolation', () => {
  it('uses a demo project without production credentials for desktop dev and unlocked dev', () => {
    const ordinary = resolveCloudRuntime({ ...defaults, emulator: true, config: undefined })
    const unlocked = resolveCloudRuntime({ ...defaults, emulator: true, unlocked: true, config: undefined })
    expect(ordinary.mode).toBe('emulator')
    expect(JSON.parse(ordinary.config!).projectId).toBe('demo-eclipse-survivors')
    expect(JSON.parse(unlocked.config!).projectId).toBe('demo-eclipse-survivors-unlocked')
  })
  it('never falls back to live Firebase when an emulator flag is accidentally used on LAN', () => {
    expect(resolveCloudRuntime({ ...defaults, emulator: true, hostname: '192.168.1.10' }).mode).toBe('unavailable')
  })
  it('supports normal phone auth and isolates unlocked phone progression from live writes', () => {
    expect(resolveCloudRuntime({ ...defaults, hostname: '192.168.1.10' }).mode).toBe('live')
    expect(resolveCloudRuntime({ ...defaults, hostname: '192.168.1.10', unlocked: true }).mode).toBe('auth-only')
    expect(resolveCloudRuntime({ ...defaults, hostname: '192.168.1.10', config: undefined }).mode).toBe('unavailable')
  })
  it('ignores development flags in a production build', () => {
    expect(resolveCloudRuntime({ ...defaults, dev: false, emulator: true, unlocked: true }).mode).toBe('live')
  })
})
