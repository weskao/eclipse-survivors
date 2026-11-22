import { describe, expect, it } from 'vitest'
import { emptyProfile, SAVE_KEY } from '../../../meta/profile'
import type { RunStats } from '../../../meta/types'
import { createMetaState, MAX_RUN_IDS } from './state'
import {
  createMetaProgressionStore, META_V3_HEAD_KEY, META_V3_SLOT_KEYS,
} from './store'

const run = (id: string): RunStats => ({
  id, mode: 'quick', hero: 'knight', victory: true, seconds: 180, kills: 100,
  level: 10, damageDealt: 1000, damageTaken: 20, remainingHp: 90,
  bossDefeated: true, enemies: { slime: 100 }, abilities: ['bolt'],
})

function memoryStorage() {
  const entries = new Map<string, string>()
  let failedKey: string | undefined
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem(key: string, value: string) {
      if (key === failedKey) throw Error('storage denied')
      entries.set(key, value)
    },
    failOn(key?: string) { failedKey = key },
    corrupt(key: string, value: string) { entries.set(key, value) },
    contents: entries,
  }
}

describe('v3 progression durable transactions', () => {
  it('stages valid v2 migration without changing the legacy key or retroactive currency', () => {
    const storage = memoryStorage()
    const legacy = { ...emptyProfile(), embers: 287, runs: 14, wins: 4,
      upgrades: { power: 2, vitality: 1 }, recentRunIds: ['past-receipt'],
      discoveredAbilities: ['bolt', 'frozen-thunderstorm'] as ReturnType<typeof emptyProfile>['discoveredAbilities'] }
    const before = JSON.stringify(legacy)
    storage.setItem(SAVE_KEY, before)
    const store = createMetaProgressionStore(storage)
    expect(store.get().status).toBe('ready')
    expect(store.get().state?.embers).toBe(287)
    expect(store.get().state?.research.power).toBe(2)
    expect(store.settle({ stats: run('past-receipt') }).reason).toBe('duplicate')
    expect(storage.getItem(META_V3_HEAD_KEY)).toBeNull()
    expect(store.settle({ stats: run('fresh-receipt') }).ok).toBe(true)
    expect(storage.getItem(SAVE_KEY)).toBe(before)
    const restored = createMetaProgressionStore(storage).get()
    expect(restored.legacyProfile).toEqual(legacy)
    expect(restored.state?.runIds).toContain('fresh-receipt')
    expect(restored.state?.runIds).toContain('past-receipt')
    expect(restored.state?.embers).toBeGreaterThan(287)
  })

  it('pays each receipt exactly once across store instances and preserves achievements', () => {
    const storage = memoryStorage()
    const a = createMetaProgressionStore(storage)
    const first = a.settle({ stats: run('unique-1') })
    expect(first.ok).toBe(true)
    expect(first.rewards.length).toBeGreaterThan(1)
    const wallet = first.state!.embers
    const b = createMetaProgressionStore(storage)
    expect(b.settle({ stats: run('unique-1') })).toMatchObject({ ok: false, reason: 'duplicate', rewards: [] })
    expect(b.get().state?.embers).toBe(wallet)
    expect(b.get().state?.achievements.filter(x => x === 'first-victory')).toHaveLength(1)
    expect(b.settle({ stats: run('unique-2') }).ok).toBe(true)
    expect(a.get().state?.runs).toBe(2)
  })

  it('commits to alternating slots and never advances the head on a failed slot write', () => {
    const storage = memoryStorage()
    const store = createMetaProgressionStore(storage)
    expect(store.settle({ stats: run('first') }).ok).toBe(true)
    const before = store.get()
    const head = JSON.parse(storage.getItem(META_V3_HEAD_KEY)!) as { slot: 'a' | 'b' }
    const nextSlot = head.slot === 'a' ? META_V3_SLOT_KEYS.b : META_V3_SLOT_KEYS.a
    storage.failOn(nextSlot)
    expect(store.settle({ stats: run('second') })).toMatchObject({ ok: false, reason: 'storage-failure' })
    expect(createMetaProgressionStore(storage).get()).toEqual(before)
    storage.failOn()
    expect(store.settle({ stats: run('second') }).ok).toBe(true)
    expect(store.get().state?.runIds).toEqual(['first', 'second'])
  })

  it('rolls back a staged snapshot if the commit pointer write is interrupted', () => {
    const storage = memoryStorage()
    const store = createMetaProgressionStore(storage)
    expect(store.settle({ stats: run('first') }).ok).toBe(true)
    const stable = store.get()
    storage.failOn(META_V3_HEAD_KEY)
    expect(store.purchaseResearch('power')).toMatchObject({ ok: false, reason: 'storage-failure' })
    expect(createMetaProgressionStore(storage).get()).toEqual(stable)
    storage.failOn()
    expect(store.purchaseResearch('power').ok).toBe(true)
    expect(createMetaProgressionStore(storage).get().state?.research.power).toBe(1)
  })

  it('refuses invalid, future or corrupt committed data rather than overwriting legacy', () => {
    const storage = memoryStorage()
    storage.setItem(SAVE_KEY, JSON.stringify(emptyProfile()))
    const store = createMetaProgressionStore(storage)
    expect(store.settle({ stats: run('first') }).ok).toBe(true)
    const head = JSON.parse(storage.getItem(META_V3_HEAD_KEY)!) as { slot: 'a' | 'b' }
    storage.corrupt(META_V3_SLOT_KEYS[head.slot], '{')
    expect(createMetaProgressionStore(storage).get().status).toBe('blocked')
    expect(createMetaProgressionStore(storage).settle({ stats: run('first') }).ok).toBe(false)
    expect(storage.getItem(SAVE_KEY)).toBe(JSON.stringify(emptyProfile()))
    storage.corrupt(META_V3_HEAD_KEY, JSON.stringify({ version: 999, slot: 'a', revision: 1 }))
    expect(createMetaProgressionStore(storage).get().status).toBe('blocked')
  })

  it('rejects invalid legacy v2 without silently resetting a corrupted wallet', () => {
    const storage = memoryStorage()
    storage.setItem(SAVE_KEY, JSON.stringify({ ...emptyProfile(), embers: -1 }))
    const store = createMetaProgressionStore(storage)
    expect(store.get().status).toBe('blocked')
    expect(store.purchaseResearch('power').reason).toBe('blocked')
    expect(storage.getItem(META_V3_HEAD_KEY)).toBeNull()
    expect(createMetaProgressionStore(null).get().status).toBe('blocked')
  })

  it('only grants research, equipment and bonuses after durable commit', () => {
    const storage = memoryStorage()
    const store = createMetaProgressionStore(storage)
    expect(store.purchaseResearch('power').ok).toBe(false)
    for (let i = 0; i < 12; i++) expect(store.settle({ stats: run('fund-' + i) }).ok).toBe(true)
    const start = store.get().state!.embers
    const p = store.purchaseResearch('power')
    expect(p.ok).toBe(true)
    expect(p.state!.embers).toBeLessThan(start)
    expect(store.purchaseResearch('insight').ok).toBe(true)
    expect(store.purchaseBonus('ember-spark').ok).toBe(true)
    expect(store.purchaseBonus('ember-spark').ok).toBe(false)
    const afterReload = createMetaProgressionStore(storage)
    expect(afterReload.get().state?.bonuses).toContain('ember-spark')
    expect(afterReload.purchaseEquipment('knight-aegis').ok).toBe(false)
  })

  it('does not acknowledge a purchase if persistence fails and reload retains the wallet', () => {
    const storage = memoryStorage()
    const store = createMetaProgressionStore(storage)
    expect(store.settle({ stats: run('funding') }).ok).toBe(true)
    const wallet = store.get().state!.embers
    storage.failOn(META_V3_HEAD_KEY)
    const failed = store.purchaseResearch('power')
    expect(failed).toMatchObject({ ok: false, reason: 'storage-failure', rewards: [] })
    expect(createMetaProgressionStore(storage).get().state?.embers).toBe(wallet)
  })

  it('stops at 20k receipts instead of evicting accepted payment proofs', () => {
    const full = { ...createMetaState(), runIds: Array.from({ length: MAX_RUN_IDS }, (_, i) => 'r-' + i) }
    const storage = memoryStorage()
    const head = { version: 3, slot: 'a', revision: 1 }
    storage.setItem(META_V3_SLOT_KEYS.a, JSON.stringify({
      schema: 'eclipse-survivors.meta.v3', revision: 1, state: full, legacyProfile: null,
    }))
    storage.setItem(META_V3_HEAD_KEY, JSON.stringify(head))
    const store = createMetaProgressionStore(storage)
    expect(store.get().status).toBe('ready')
    expect(store.settle({ stats: run('next') })).toMatchObject({ ok: false, reason: 'ledger-full' })
    expect(store.get().state?.runIds).toHaveLength(MAX_RUN_IDS)
  })
})

describe('uncertain post-write storage acknowledgement', () => {
  it('does not pay the same receipt again when setItem throws after the head was stored', () => {
    const disk = memoryStorage()
    const flaky = {
      getItem: disk.getItem,
      setItem(key: string, value: string) {
        disk.setItem(key, value)
        if (key === META_V3_HEAD_KEY) throw Error('acknowledgement lost')
      },
    }
    const first = createMetaProgressionStore(flaky).settle({ stats: run('uncertain-receipt') })
    expect(first.ok).toBe(false)
    expect(first.rewards).toEqual([])
    const recovered = createMetaProgressionStore(disk)
    expect(recovered.get().state?.runs).toBe(1)
    expect(recovered.settle({ stats: run('uncertain-receipt') }).reason).toBe('duplicate')
    expect(recovered.get().state?.runs).toBe(1)
  })
})

describe('commit slot verification', () => {
  it('does not acknowledge a revision if the pointed-to slot changes during final verification', () => {
    const disk = memoryStorage()
    let headWritten = false
    let headReads = 0
    const racing = {
      getItem(key: string) {
        if (key === META_V3_HEAD_KEY && headWritten && ++headReads === 2) {
          const head = JSON.parse(disk.getItem(META_V3_HEAD_KEY)!) as { slot: 'a' | 'b' }
          const slot = META_V3_SLOT_KEYS[head.slot]
          const forged = JSON.parse(disk.getItem(slot)!) as { state: ReturnType<typeof createMetaState> }
          forged.state.embers += 1
          disk.corrupt(slot, JSON.stringify(forged))
        }
        return disk.getItem(key)
      },
      setItem(key: string, value: string) {
        disk.setItem(key, value)
        if (key === META_V3_HEAD_KEY) headWritten = true
      },
    }
    const result = createMetaProgressionStore(racing).settle({ stats: run('racing') })
    expect(result).toMatchObject({ ok: false, reason: 'storage-failure', rewards: [] })
  })
})
