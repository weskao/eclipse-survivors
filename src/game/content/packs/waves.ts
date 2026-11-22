import type { ContentPack } from '../contracts'

/**
 * Registration-only metadata for the independent wave director.
 * Integration owns the manifest and the spawn/announcement adapter.
 * Import createWaveDirector from ../director; registering this pack alone
 * intentionally leaves existing spawn, boss, save and victory rules untouched.
 */
export const WAVES_PACK: ContentPack = {
  id: 'waves',
  worldEvents: [
    { id: 'waves:build-up', title: '暗潮湧動' },
    { id: 'waves:assault', title: '魔物突襲' },
    { id: 'waves:reward', title: '戰利品時刻' },
    { id: 'waves:recovery', title: '短暫喘息' },
    { id: 'waves:boss-prep', title: '首領即將降臨' },
    { id: 'waves:boss', title: '首領決戰' },
    { id: 'waves:mini-boss', title: '精英首領襲來' },
  ],
}
