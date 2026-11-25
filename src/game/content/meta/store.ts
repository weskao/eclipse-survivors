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

/** These keys are independent of the legacy v2 profile. Only integration may retire v2 writes. */
export const META_V3_HEAD_KEY = 'eclipse-survivors.meta.v3.head'
export const META_V3_SLOT_KEYS = {
  a: 'eclipse-survivors.meta.v3.a',
  b: 'eclipse-survivors.meta.v3.b',
} as const

type Slot = keyof typeof META_V3_SLOT_KEYS
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
type Failure = 'blocked' | 'duplicate' | 'invalid' | 'ledger-full' | 'ineligible' | 'storage-failure'
interface Head { version: 3; slot: Slot; revision: number }
interface Envelope {
  schema: 'eclipse-survivors.meta.v3'
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
}
export type MetaStoreSnapshot = Omit<Loaded, 'slot'>
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

function parseHead(raw: string): Head | null {
  try {
    const value: unknown = JSON.parse(raw)
    return isObject(value) && value.version === 3 && (value.slot === 'a' || value.slot === 'b')
      && revisionValid(value.revision)
      ? { version: 3, slot: value.slot, revision: value.revision }
      : null
  } catch { return null }
}

function parseEnvelope(raw: string, revision: number): Envelope | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (!isObject(value) || value.schema !== 'eclipse-survivors.meta.v3'
      || value.revision !== revision || !validateMetaState(value.state)) return null
    const legacy = value.legacyProfile
    if (legacy !== null && (!isObject(legacy) || legacy.version !== 2 || !migrateProfile(legacy))) return null
    return value as unknown as Envelope
  } catch { return null }
}

/**
 * Only a pointed-to and validated slot is committed. Unpointed staged writes
 * are ignored after an interruption. Corrupted committed data fails closed.
 */
function load(storage: StoragePort | null): Loaded {
  if (!storage) return blocked()
  try {
    const pointer = storage.getItem(META_V3_HEAD_KEY)
    if (pointer !== null) {
      const head = parseHead(pointer)
      if (!head) return blocked()
      const data = storage.getItem(META_V3_SLOT_KEYS[head.slot])
      const envelope = data === null ? null : parseEnvelope(data, head.revision)
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
): MetaProgressionStore {
  const rejected = (reason: Failure, state: MetaState | null): MetaTransactionResult =>
    ({ ok: false, reason, state: state ? cloneMetaState(state) : null, rewards: [] })

  function commit(previous: Loaded, next: MetaState, rewards: GrantedReward[]): MetaTransactionResult {
    if (!storage || !validateMetaState(next) || previous.revision >= Number.MAX_SAFE_INTEGER)
      return rejected('invalid', previous.state)
    const slot: Slot = previous.slot === 'a' ? 'b' : 'a'
    const revision = previous.revision + 1
    const data = JSON.stringify({
      schema: 'eclipse-survivors.meta.v3', revision, state: next,
      legacyProfile: previous.legacyProfile,
    } satisfies Envelope)
    const head = JSON.stringify({ version: 3, slot, revision } satisfies Head)
    try {
      // Stage in the inactive slot. The previous head still points at the old commit.
      storage.setItem(META_V3_SLOT_KEYS[slot], data)
      if (storage.getItem(META_V3_SLOT_KEYS[slot]) !== data) throw Error('unverified slot')
      // This single key is the linearization/commit point. Never acknowledge earlier.
      storage.setItem(META_V3_HEAD_KEY, head)
      if (storage.getItem(META_V3_HEAD_KEY) !== head) throw Error('unverified head')
      const verified = load(storage)
      if (verified.status !== 'ready' || verified.revision !== revision || verified.slot !== slot
        || storage.getItem(META_V3_SLOT_KEYS[slot]) !== data
        || storage.getItem(META_V3_HEAD_KEY) !== head)
        throw Error('unverified commit')
      return { ok: true, state: cloneMetaState(next), rewards }
    } catch {
      // An unpointed write is not committed. A throwing post-write implementation
      // may have committed; reloading and replay protection will reconcile it.
      return rejected('storage-failure', load(storage).state ?? previous.state)
    }
  }

  function purchase(
    id: string, operation: (state: MetaState, id: string) => PurchaseResult,
  ): MetaTransactionResult {
    const current = load(storage)
    if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
    const change = operation(current.state, id)
    if (!change.ok) return rejected('ineligible', current.state)
    return commit(current, change.state, [])
  }

  return {
    get: () => snapshot(load(storage)),
    applyCloudWallet(wallet, expectedBalance, preserveBalance) {
      const current = load(storage)
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
      const current = load(storage)
      if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
      const change: ProgressResult = applyCompletedRun(current.state, receipt)
      if (!change.accepted) return rejected(change.reason ?? 'invalid', current.state)
      return commit(current, change.state, change.rewards)
    },
    purchaseResearch: id => purchase(id, buyResearch),
    purchaseEquipment: id => purchase(id, unlockStartingEquipment),
    purchaseBonus: id => purchase(id, unlockStartingBonus),
    selectCosmetic(hero, skin) {
      const current = load(storage)
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
      const current = load(storage)
      if (current.status !== 'ready' || !current.state) return rejected('blocked', null)
      // The new envelope intentionally drops the legacy rollback snapshot.
      const next = createMetaState()
      if (current.state.cloudWallet) next.cloudWallet = { ...current.state.cloudWallet }
      return commit({ ...current, legacyProfile: null }, next, [])
    },
  }
}
