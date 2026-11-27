import { resolveHallRunSnapshot } from './hall-state'
import type { MetaState } from './state'

/**
 * ES4 rollout boundary. Legacy/preview use the same null run strategy; the
 * isolated DEV strategy enables V4 and commands without accessing cloud funds.
 * Remove this switch at permanent rollout, not individual combat checks.
 */
export function createHallFeature(flag: unknown, development: boolean, unlocked: boolean) {
  const visible = flag === '1'
  const playable = visible && development && unlocked
  const metaVersion = playable ? 4 as const : 3 as const
  const snapshot = playable
    ? resolveHallRunSnapshot
    : (_state: MetaState | null, hero: string) => resolveHallRunSnapshot(null, hero)
  return {
    visible, playable, metaVersion, snapshot,
    allowsWallet: !playable,
    canEdit: (mode: string, account: string | null) => playable && mode === 'menu' && account === null,
    treasureControls: (chestId: number, rerolls: number) => playable ? { chestId, rerolls } : {},
  }
}

/** Vite substitutes the environment at build time; no localStorage or URL toggle. */
export function hallFeature() {
  return createHallFeature(import.meta.env.VITE_ES4_HALL, import.meta.env.DEV, import.meta.env.VITE_ES2_UNLOCKED === '1')
}
