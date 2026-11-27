import { validWallet, type CloudWallet } from '../../../cloud/wallet-policy'
import { migrateProfile, SAVE_KEY } from '../../../meta/profile'
import type { CosmeticId, Profile } from '../../../meta/types'
import type { JobId } from '../../types'
import {
  applyCompletedRun, buyResearch, unlockStartingBonus, unlockStartingEquipment,
  type GrantedReward, type ProgressResult, type PurchaseResult, type RunReceipt,
} from './progression'
import { cloneMetaState, createMetaState, validateMetaState, type MetaState } from './state'
import { proposeV2Migration } from './migration'
import { emptyHall, equipHall, normalizeHallAttunement, purchaseHallTalent, validHallOwnership } from './hall-state'

/** These keys are independent of the legacy v2 profile. Only integration may retire v2 writes. */
export const META_V3_HEAD_KEY = 'eclipse-survivors.meta.v3.head'
export const META_V3_SLOT_KEYS = {
  a: 'eclipse-survivors.meta.v3.a',
  b: 'eclipse-survivors.meta.v3.b',
} as const

export const META_V4_HEAD_KEY = 'eclipse-survivors.meta.v4.head'
export const META_V4_SLOT_KEYS = { a: 'eclipse-survivors.meta.v4.a', b: 'eclipse-survivors.meta.v4.b' } as const
type MetaVersion = 3 | 4
type Slot = keyof typeof META_V3_SLOT_KEYS
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
type Failure = 'blocked' | 'duplicate' | 'invalid' | 'ledger-full' | 'ineligible' | 'storage-failure'
interface Head { version: MetaVersion; slot: Slot; revision: number }
interface Envelope {
  schema: 'eclipse-survivors.meta.v3' | 'eclipse-survivors.meta.v4'
  legacyAnchor?: string
  revision: number
  state: MetaState
  /** Kept for the host's explicit migration rollback; never rewrite the v2 key here. */
  legacyProfile: Profile | null
}
interface Loaded {
  status: 'ready' | 'blocked'
  state: MetaState | null
  legacyProfile: Profile | null
  revision: number
  slot: Slot | null
  legacyAnchor?: string
}
export type MetaStoreSnapshot = Omit<Loaded, 'slot' | 'legacyAnchor'>
export interface MetaTransactionResult {
  ok: boolean
  reason?: Failure
  /** Present only when the head pointer and committed envelope were verified. */
  rewards: GrantedReward[]
  state: MetaState | null
}
export interface MetaProgressionStore {
  get(): MetaStoreSnapshot
  applyCloudWallet(wallet: CloudWallet, expectedBalance: number, preserveBalance: boolean): MetaTransactionResult
  settle(receipt: RunReceipt): MetaTransactionResult
  purchaseResearch(id: string): MetaTransactionResult
  purchaseTalent(id: string, hero: string, expectedRank: number): MetaTransactionResult
  setHallAttunement(hero: string, universal: string[], signature: string | null, resonance: string | null): MetaTransactionResult
  purchaseEquipment(id: string): MetaTransactionResult
  purchaseBonus(id: string): MetaTransactionResult
  selectCosmetic(hero: JobId, skin: CosmeticId): MetaTransactionResult
  /** User-initiated reset. Never erase a committed save before the new head verifies. */
  reset(): MetaTransactionResult
}

const blocked = (): Loaded => ({
  status: 'blocked', state: null, legacyProfile: null, revision: 0, slot: null,
})
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const revisionValid = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0

function parseHead(raw: string, version: MetaVersion): Head | null {
  try {
    const value: unknown = JSON.parse(raw)
    return isObject(value) && value.version === version && (value.slot === 'a' || value.slot === 'b')
      && revisionValid(value.revision)
      ? { version, slot: value.slot, revision: value.revision }
      : null
  } catch { return null }
}

function parseEnvelope(raw: string, revision: number, version: MetaVersion): Envelope | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (!isObject(value) || value.schema !== 'eclipse-survivors.meta.v' + version
      || value.revision !== revision || !isObject(value.state) || value.state.version !== version) return null
    // Only malformed selection may be repaired. Invalid ownership is never discarded.
    const candidate = value.state
    if (version === 4 && !validateMetaState(candidate)) {
      const legacy = { ...candidate, version: 3, hall: undefined }
      if (!validateMetaState(legacy) || !isObject(candidate.hall)
        || !validHallOwnership(candidate.hall.ownership, legacy)) return null
      candidate.hall = { ownership: candidate.hall.ownership, attunement: normalizeHallAttunement(candidate.hall.attunement, candidate.hall.ownership) }
    }
    if (!validateMetaState(candidate) || (version === 4 && typeof value.legacyAnchor !== 'string')) return null
    const legacy = value.legacyProfile
    if (legacy !== null && (!isObject(legacy) || legacy.version !== 2 || !migrateProfile(legacy))) return null
    return value as unknown as Envelope
  } catch { return null }
}

/**
 * Only a pointed-to and validated slot is committed. Unpointed staged writes
 * are ignored after an interruption. Corrupted committed data fails closed.
 */
function loadLegacy(storage: StoragePort | null): Loaded {
  if (!storage) return blocked()
  try {
    const pointer = storage.getItem(META_V3_HEAD_KEY)
    if (pointer !== null) {
      const head = parseHead(pointer, 3)
      if (!head) return blocked()
      const data = storage.getItem(META_V3_SLOT_KEYS[head.slot])
      const envelope = data === null ? null : parseEnvelope(data, head.revision, 3)
      if (!envelope) return blocked()
      return {
        status: 'ready', state: envelope.state, legacyProfile: envelope.legacyProfile,
        revision: head.revision, slot: head.slot,
      }
    }
    const old = storage.getItem(SAVE_KEY)
    if (old === null) {
      return { status: 'ready', state: createMetaState(), legacyProfile: null, revision: 0, slot: null }
    }
    const migration = proposeV2Migration(JSON.parse(old) as unknown)
    if (!migration) return blocked()
    return {
      status: 'ready', state: migration.next, legacyProfile: migration.legacyProfile,
      revision: 0, slot: null,
    }
  } catch { return blocked() }
}

/** V4 is local-only until the shared cloud wallet can fence stale clients.
 * A changed V3 head or V2 source blocks further V4 writes instead of replaying currency.
 * This does not authorize old-client use: a downgrade requires explicit recovery.
 */
function legacyAnchor(storage: StoragePort): string {
  const pointer = storage.getItem(META_V3_HEAD_KEY)
  return pointer === null ? JSON.stringify([null, storage.getItem(SAVE_KEY)]) : JSON.stringify([pointer])
}
function load(storage: StoragePort | null, version: MetaVersion): Loaded {
  if (!storage) return blocked()
  try {
    const pointer = storage.getItem(META_V4_HEAD_KEY)
    if (version === 3) return pointer === null ? loadLegacy(storage) : blocked()
    const anchor = legacyAnchor(storage)
    if (pointer === null) {
      const previous = loadLegacy(storage)
      if (previous.status !== 'ready' || !previous.state || previous.state.cloudWallet) return blocked()
      return { ...previous, slot: null, revision: 0, legacyAnchor: anchor,
        state: { ...previous.state, version: 4, hall: emptyHall() } }
    }
    const head = parseHead(pointer, 4)
    if (!head) return blocked()
    const data = storage.getItem(META_V4_SLOT_KEYS[head.slot])
    const envelope = data === null ? null : parseEnvelope(data, head.revision, 4)
    if (!envelope || envelope.legacyAnchor !== anchor || envelope.state.cloudWallet) return blocked()
    return { status: 'ready', state: envelope.state, legacyProfile: envelope.legacyProfile, revision: head.revision, slot: head.slot, legacyAnchor: anchor }
  } catch { return blocked() }
}

function defaultStorage(): StoragePort | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}
const snapshot = (value: Loaded): MetaStoreSnapshot => ({
  status: value.status,
  state: value.state ? cloneMetaState(value.state) : null,
  legacyProfile: value.legacyProfile ? JSON.parse(JSON.stringify(value.legacyProfile)) as Profile : null,
  revision: value.revision,
})

/**
 * Synchronous, single-writer transaction boundary. All v3 currency spending
 * and grants go through this object; the host must route exactly one completed
 * run event here and must not also invoke the legacy recordRun writer.
 */
export function createMetaProgressionStore(
  storage: StoragePort | null = defaultStorage(),
  version: MetaVersion = 3,
): MetaProgressionStore {
  const headKey = version === 4 ? META_V4_HEAD_KEY : META_V3_HEAD_KEY
  const slots = version === 4 ? META_V4_SLOT_KEYS : META_V3_SLOT_KEYS
  const rejected = (reason: Failure, state: MetaState | null): MetaTransactionResult =>
    ({ ok: false, reason, state: state ? cloneMetaState(state) : null, rewards: [] })

  function commit(previous: Loaded, next: MetaState, rewards: GrantedReward[]): MetaTransactionResult {
    if (!storage || next.version !== version || !validateMetaState(next) || previous.revision >= Number.MAX_SAFE_INTEGER)
      return rejected('invalid', previous.state)
    const slot: Slot = previous.slot === 'a' ? 'b' : 'a'
    const revision = previous.revision + 1
    const data = JSON.stringify({
      schema: version === 4 ? 'eclipse-survivors.meta.v4' : 'eclipse-survivors.meta.v3', revision, state: next,
      ...(version === 4 ? { legacyAnchor: previous.legacyAnchor } : {}),
      legacyProfile: previous.legacyProfile,
    } satisfies Envelope)
    const head = JSON.stringify({ version, slot, revision } satisfies Head)
    try {
      if (version === 4 && (legacyAnchor(storage) !== previous.legacyAnchor || next.cloudWallet)) return rejected('blocked', previous.state)
      // Stage in the inactive slot. The previous head still points at the old commit.
      storage.setItem(slots[slot], data)
      if (storage.getItem(slots[slot]) !== data) throw Error('unverified slot')
      if (version === 4 && legacyAnchor(storage) !== previous.legacyAnchor) return rejected('blocked', previous.state)
      // This single key is the linearization/commit point. Never acknowledge earlier.
      storage.setItem(headKey, head)
      if (storage.getItem(headKey) !== head) throw Error('unverified head')
      const verified = load(storage, version)
      if (verified.status !== 'ready' || verified.revision !== revision || verified.slot !== slot
        || storage.getItem(slots[slot]) !== data
        || storage.getItem(headKey) !== head)
        throw Error('unverified commit')
      return { ok: true, state: cloneMetaState(next), rewards }
    } catch {
      // An unpointed write is not committed. A throwing post-write implementation
      // may have committed; reloading and replay protection will reconcile it.
      return rejected('storage-failure', load(storage, version).state ?? previous.state)
    }
  }

  function purchase(
    id: string, operation: (state: MetaState, id: string) => PurchaseResult,
  ): MetaTransactionResult {
    const current = load(storage, version)
    if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
    const change = operation(current.state, id)
    if (!change.ok) return rejected('ineligible', current.state)
    return commit(current, change.state, [])
  }

  return {
    get: () => snapshot(load(storage, version)),
    applyCloudWallet(wallet, expectedBalance, preserveBalance) {
      if (version === 4) return rejected('blocked', load(storage, version).state)
      const current = load(storage, version)
      if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
      if (!validWallet(wallet) || (!preserveBalance && current.state.embers !== expectedBalance)) return rejected('invalid', current.state)
      const next = cloneMetaState(current.state)
      if (!preserveBalance) next.embers = wallet.embers
      if (next.embers === current.state.embers && next.cloudWallet?.revision === wallet.revision && next.cloudWallet.embers === wallet.embers)
        return { ok: true, state: next, rewards: [] }
      next.cloudWallet = { ...wallet }
      return commit(current, next, [])
    },
    settle(receipt) {
      const current = load(storage, version)
      if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
      const change: ProgressResult = applyCompletedRun(current.state, receipt)
      if (!change.accepted) return rejected(change.reason ?? 'invalid', current.state)
      return commit(current, change.state, change.rewards)
    },
    purchaseResearch: id => purchase(id, buyResearch),
    purchaseTalent(id, hero, expectedRank) {
      return purchase(id, state => { const next = purchaseHallTalent(state, id, hero, expectedRank); return { ok: !!next, state: next ?? state } })
    },
    setHallAttunement(hero, universal, signature, resonance) {
      return purchase(hero, state => { const next = equipHall(state, hero, universal, signature, resonance); return { ok: !!next, state: next ?? state } })
    },
    purchaseEquipment: id => purchase(id, unlockStartingEquipment),
    purchaseBonus: id => purchase(id, unlockStartingBonus),
    selectCosmetic(hero, skin) {
      const current = load(storage, version)
      if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
      if (!['knight', 'ranger', 'wizard'].includes(hero) || !skin.startsWith(hero + '-')
        || (skin !== hero + '-default' && !current.state.cosmetics.includes(skin)))
        return rejected('ineligible', current.state)
      if (current.state.equippedCosmetics?.[hero] === skin)
        return { ok: true, state: cloneMetaState(current.state), rewards: [] }
      const next = cloneMetaState(current.state)
      next.equippedCosmetics = { ...next.equippedCosmetics, [hero]: skin }
      return commit(current, next, [])
    },
    reset() {
      const current = load(storage, version)
      if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
      // The new envelope intentionally drops the legacy rollback snapshot.
      const next = createMetaState()
      if (version === 4) { next.version = 4; next.hall = emptyHall() }
      if (current.state.cloudWallet) next.cloudWallet = { ...current.state.cloudWallet }
      return commit({ ...current, legacyProfile: null }, next, [])
    },
  }
}
