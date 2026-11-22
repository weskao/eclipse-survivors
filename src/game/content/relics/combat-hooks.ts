import type { ContentEvent, GameState, Mob } from '../../types'
import { calculateRelicAttack, calculateRelicIncoming, relicBonuses,
  relicPickupRadius, resetRelics, tickRelicRecovery, type AttackContext, type AttackResult,
  type IncomingResult } from './runtime'

/** Host assigns strictly increasing positive serials to real hits and incoming contacts. */
const MAX_PENDING_CONTACTS = 130
const validSerial = (value: number): boolean => Number.isSafeInteger(value) && value > 0
const validDamage = (value: number): boolean => Number.isFinite(value) && value >= 0
const trimOldest = <T>(map: Map<number, T>): void => {
  if (map.size >= MAX_PENDING_CONTACTS) map.delete(map.keys().next().value!)
}

/**
 * One adapter per run; host owns damage, death, XP, shield processing and projectiles.
 * Replayed serials never resolve a second strike or issue a second ContentEvent.
 * The emit callback should be exactly one ContentRegistry.emit path, not an
 * additional direct call to onRelicEvent alongside an already registered pack.
 */
export function createRelicCombatHooks(state: GameState, random: () => number,
  emit: (event: ContentEvent) => void) {
  let lastOutgoing = 0
  let lastIncoming = 0
  const outgoing = new Map<number, number>()
  const incomingContacts = new Map<number, { dodged: boolean; reflect: number; damage: number }>()

  return {
    attack(serial: number, damage: number, context: AttackContext): AttackResult | null {
      if (!validSerial(serial) || serial <= lastOutgoing || !state.hero || state.mode !== 'play' ||
        !Number.isFinite(damage) || damage <= 0) return null
      const result = calculateRelicAttack(state, damage, context, random)
      if (!Number.isFinite(result.damage)) return null
      lastOutgoing = serial
      // Execute is a real lethal damage floor when the host supplies pre-hit HP.
      const resolved = result.execute && Number.isFinite(context.targetHp) && context.targetHp! > 0
        ? { ...result, damage: Math.max(result.damage, context.targetHp!) } : result
      trimOldest(outgoing)
      outgoing.set(serial, resolved.damage)
      return resolved
    },

    confirmHit(serial: number, mob: Mob, appliedDamage: number, killed: boolean): boolean {
      const maximum = outgoing.get(serial)
      if (maximum === undefined || !mob || !validDamage(appliedDamage) ||
        appliedDamage > maximum + 1e-9 ||
        (killed && (appliedDamage === 0 || !Number.isFinite(mob.hp) || mob.hp > 0))) return false
      outgoing.delete(serial)
      if (appliedDamage > 0) {
        emit({ type: 'hit', mob, damage: appliedDamage })
        if (killed) emit({ type: 'kill', mob, damage: appliedDamage })
      }
      return true
    },

    incoming(serial: number, amount: number): IncomingResult | null {
      if (!validSerial(serial) || serial <= lastIncoming || !state.hero || state.mode !== 'play' ||
        !Number.isFinite(amount) || amount <= 0) return null
      const result = calculateRelicIncoming(state, amount, random)
      if (!Number.isFinite(result.damage)) return null
      lastIncoming = serial
      trimOldest(incomingContacts)
      incomingContacts.set(serial, { dodged: result.dodged, damage: result.damage,
        reflect: Math.max(0, relicBonuses(state).reflect ?? 0) })
      return result
    },

    /** Only actual hero HP damage may reflect; shield/immunity hits reflect zero. */
    confirmIncoming(serial: number, actualDamage: number): number | null {
      const contact = incomingContacts.get(serial)
      if (!contact || !validDamage(actualDamage) || actualDamage > contact.damage + 1e-9 ||
        (contact.dodged && actualDamage > 0)) return null
      incomingContacts.delete(serial)
      if (actualDamage === 0) return 0
      emit({ type: 'damage', amount: actualDamage })
      return actualDamage * contact.reflect
    },

    pickupRadius: (radius: number): number => relicPickupRadius(state, radius),
    tick: (dt: number): void => tickRelicRecovery(state, dt),
    pendingAttacks: (): number => outgoing.size,

    /** Call after host creates a fresh hero; relic bonuses must not survive into another run. */
    reset(): void {
      lastOutgoing = 0
      lastIncoming = 0
      outgoing.clear()
      incomingContacts.clear()
      resetRelics(state)
    },
  }
}
