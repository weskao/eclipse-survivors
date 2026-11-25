import { describe, it, expect } from 'vitest'
import { validWallet, walletPlan } from './wallet-policy'
const wallet = (embers: number, revision: number) => ({ embers, revision })
describe('Twilight Embers cloud policy', () => {
  it('accepts only a safe integer balance and revision', () => {
    expect(validWallet(wallet(0, 0))).toBe(true)
    for (const value of [null, wallet(-1, 0), wallet(1.5, 0), wallet(2, -1), wallet(2, 1.2), wallet(Number.MAX_SAFE_INTEGER + 1, 1), {...wallet(5, 1), research: {}}]) expect(validWallet(value)).toBe(false)
  })
  it('restores first login and never uploads untracked nonzero local data', () => {
    expect(walletPlan(null, 0, wallet(100, 2))).toBe('restore')
    expect(walletPlan(null, 80, wallet(100, 2))).toBe('conflict')
  })
  it('uploads gains and spending only against unchanged cloud revision', () => {
    expect(walletPlan(wallet(100, 2), 125, wallet(100, 2))).toBe('upload')
    expect(walletPlan(wallet(100, 2), 75, wallet(100, 2))).toBe('upload')
    expect(walletPlan(wallet(100, 2), 75, wallet(120, 3))).toBe('conflict')
  })
  it('restores clean or converged wallets without writing again', () => {
    expect(walletPlan(wallet(100, 2), 100, wallet(120, 3))).toBe('restore')
    expect(walletPlan(wallet(100, 2), 75, wallet(75, 3))).toBe('restore')
    expect(walletPlan(wallet(100, 2), 75, wallet(100, 3))).toBe('conflict')
  })
})
