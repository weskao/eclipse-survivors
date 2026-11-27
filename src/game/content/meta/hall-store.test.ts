import { describe, expect, it } from 'vitest'
import { createMetaState } from './state'
import { createMetaProgressionStore, META_V3_HEAD_KEY, META_V3_SLOT_KEYS, META_V4_HEAD_KEY, META_V4_SLOT_KEYS } from './store'

function disk() {
  const map = new Map<string, string>()
  let fail = ''
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem(key: string, value: string) { if (key === fail) throw Error('quota'); map.set(key, value) },
  }
  const state = createMetaState()
  state.embers = 500
  state.research.power = 1
  state.runs = 1
  state.runIds = ['historic']
  state.mastery.knight = { xp: 900, level: 3 }
  storage.setItem(META_V3_HEAD_KEY, JSON.stringify({ version: 3, slot: 'a', revision: 1 }))
  storage.setItem(META_V3_SLOT_KEYS.a, JSON.stringify({ schema: 'eclipse-survivors.meta.v3', revision: 1, state, legacyProfile: null }))
  return { storage, map, failOn: (key: string) => { fail = key } }
}

describe('V4 Hall storage', () => {
  it('migrates without touching V3, spends once and survives reload', () => {
    const { storage, map } = disk()
    const before = new Map(map)
    const store = createMetaProgressionStore(storage, 4)
    expect(store.get().state).toMatchObject({ version: 4, embers: 500, runIds: ['historic'], research: { power: 1 }, hall: { ownership: {} } })
    expect(map).toEqual(before)
    expect(store.purchaseTalent('offense-edge', 'knight', 0).ok).toBe(true)
    expect(store.purchaseTalent('offense-edge', 'knight', 0).ok).toBe(false)
    expect(createMetaProgressionStore(storage, 4).get().state).toMatchObject({ embers: 460, hall: { ownership: { 'offense-edge': 1 } } })
    for (const [key,value] of before) expect(storage.getItem(key)).toBe(value)
    expect(createMetaProgressionStore(storage).get().status).toBe('blocked')
  })
  it('retains V3 and committed V4 on a failed slot or head write', () => {
    const { storage, failOn } = disk()
    const store = createMetaProgressionStore(storage, 4)
    failOn(META_V4_SLOT_KEYS.a)
    expect(store.purchaseTalent('offense-edge','knight',0).ok).toBe(false)
    expect(store.get().state?.embers).toBe(500)
    failOn(META_V4_HEAD_KEY)
    expect(store.purchaseTalent('offense-edge','knight',0).ok).toBe(false)
    expect(storage.getItem(META_V4_HEAD_KEY)).toBeNull()
    failOn('')
    expect(store.purchaseTalent('offense-edge','knight',0).ok).toBe(true)
    failOn(META_V4_HEAD_KEY)
    expect(store.purchaseTalent('offense-edge','knight',1).ok).toBe(false)
    expect(store.get().state?.embers).toBe(460)
  })
  it('blocks corrupt head, unknown ownership and stale legacy client writes', () => {
    const { storage } = disk()
    const store = createMetaProgressionStore(storage,4)
    expect(store.purchaseTalent('offense-edge','knight',0).ok).toBe(true)
    const original = storage.getItem(META_V4_SLOT_KEYS.a)!
    const envelope = JSON.parse(original)
    envelope.state.hall.ownership.unknown = 1
    storage.setItem(META_V4_SLOT_KEYS.a,JSON.stringify(envelope))
    expect(store.get().status).toBe('blocked')
    storage.setItem(META_V4_SLOT_KEYS.a,original)
    storage.setItem(META_V3_HEAD_KEY,JSON.stringify({version:3,slot:'b',revision:2}))
    expect(store.get().status).toBe('blocked')
    expect(store.purchaseTalent('offense-edge','knight',1).ok).toBe(false)
  })
  it('normalizes invalid selections without discarding valid ownership; blocks cloud', () => {
    const { storage } = disk()
    const store = createMetaProgressionStore(storage,4)
    expect(store.purchaseTalent('offense-edge','knight',0).ok).toBe(true)
    const envelope = JSON.parse(storage.getItem(META_V4_SLOT_KEYS.a)!)
    envelope.state.hall.attunement = { universal: ['invalid'], hero: {}, resonance: null }
    storage.setItem(META_V4_SLOT_KEYS.a, JSON.stringify(envelope))
    expect(store.get().state?.hall).toEqual({ ownership: {'offense-edge':1}, attunement:{universal:[],hero:{},resonance:null} })
    expect(store.applyCloudWallet({revision:1,embers:600},460,false).ok).toBe(false)
  })
})
