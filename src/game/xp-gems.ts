import { BALANCE } from './config'
import type { Star } from './types'

/** Keep the original bounded visible gem budget without silently destroying XP.
 * Ordinary drops allocate nothing extra. Overflow groups equal XP receipts and
 * transfers them to the oldest retained gem; its collection still emits every
 * original receipt. No second render owner or invisible accumulating actors.
 */
export function compactXpGems(stars: Star[]): void {
  let write = 0
  for (let read = 0; read < stars.length; read++) {
    const star = stars[read]!
    if (!star.dead) stars[write++] = star
  }
  stars.length = write
  const overflow = write - BALANCE.combat.starKeepLimit
  if (overflow <= 0) return
  const target = stars[overflow]!
  const receipts = target.mergedReceipts ?? new Map([[target.value, 1]])
  for (let i = 0; i < overflow; i++) {
    const star = stars[i]!
    target.value += star.value
    if (star.mergedReceipts) {
      for (const [amount, count] of star.mergedReceipts) receipts.set(amount, (receipts.get(amount) ?? 0) + count)
    } else {
      receipts.set(star.value, (receipts.get(star.value) ?? 0) + 1)
    }
  }
  target.mergedReceipts = receipts
  stars.splice(0, overflow)
}
