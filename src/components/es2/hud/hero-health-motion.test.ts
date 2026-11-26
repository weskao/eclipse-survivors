import { describe, expect, it } from 'vitest'
import { createHeroHealthMotion } from './hero-health-motion'
import type { HealthBarFrame } from '../../../game/render/health-bars'

function setup() {
  let now = 0, id = 0
  const pending = new Map<number, FrameRequestCallback>()
  let frame: HealthBarFrame = { front: 0, trail: 0, target: 0 }
  const motion = createHeroHealthMotion(next => { frame = { ...next } }, {
    now: () => now, request: cb => { pending.set(++id, cb); return id },
    cancel: key => { pending.delete(key) },
  })
  const advance = (ms: number) => {
    now += ms
    const callbacks = [...pending.values()]
    pending.clear()
    callbacks.forEach(cb => cb(now))
  }
  const settle = () => { for (let i = 0; i < 120 && pending.size; i++) advance(16) }
  return { motion, advance, settle, frame: () => frame, pending }
}

describe('hero HUD health animation using the shared enemy sampler', () => {
  it('holds damage then eases to actual HP without keeping a permanent animation loop', () => {
    const { motion, advance, settle, frame, pending } = setup()
    motion.update(100, true, false)
    expect(pending.size).toBe(0)
    advance(10000)
    motion.update(30, true, false)
    expect(frame()).toMatchObject({ target: .3, front: 1, trail: 1 })
    advance(40)
    expect(frame().front).toBeGreaterThan(.3)
    expect(frame().front).toBeLessThan(1)
    expect(frame().trail).toBe(1)
    advance(40)
    expect(frame().trail).toBeCloseTo(1)
    advance(80)
    expect(frame().trail).toBeLessThan(1)
    expect(frame().trail).toBeGreaterThan(frame().front)
    settle()
    expect(frame()).toMatchObject({ target: .3, front: .3, trail: .3 })
    expect(pending.size).toBe(0)
  })
  it('clears damage on healing even below the prior eased front', () => {
    const { motion, advance, settle, frame, pending } = setup()
    motion.update(100, true, false)
    motion.update(20, true, false)
    advance(32)
    expect(frame().trail).toBeGreaterThan(frame().front)
    motion.update(25, true, false)
    expect(frame().trail).toBe(frame().front)
    settle()
    motion.update(80, true, false)
    advance(40)
    expect(frame().front).toBeGreaterThan(.25)
    expect(frame().front).toBeLessThan(.8)
    expect(frame().trail).toBe(frame().front)
    settle()
    expect(frame()).toMatchObject({ target: .8, front: .8, trail: .8 })
    expect(pending.size).toBe(0)
  })
  it('handles repeated damage, zero HP, reduced motion, Home and a new run', () => {
    const { motion, advance, frame, pending } = setup()
    motion.update(100, true, false)
    motion.update(70, true, false)
    advance(32)
    motion.update(10, true, false)
    expect(pending.size).toBe(1)
    advance(16)
    expect(frame().trail).toBeGreaterThan(frame().front)
    motion.update(0, true, true)
    expect(frame()).toMatchObject({ target: 0, front: 0, trail: 0 })
    expect(pending.size).toBe(0)
    motion.update(90, true, false)
    expect(pending.size).toBe(1)
    motion.update(90, false, false)
    expect(pending.size).toBe(0)
    motion.update(100, true, false)
    expect(frame()).toMatchObject({ target: 1, front: 1, trail: 1 })
    motion.update(40, true, false)
    motion.dispose()
    expect(pending.size).toBe(0)
  })
})

it('uses real crit versions for a high-HP boss and clears them on healing or a new encounter', () => {
  const { motion, advance, frame, pending } = setup()
  motion.update(100, true, false, 0)
  motion.update(99, true, false, 5)
  advance(32)
  expect(frame().impact).toBe('critical')
  expect(frame().trail).toBe(1)
  motion.update(100, true, false, 5)
  expect(frame().impact).toBeUndefined()
  motion.update(100, false, false, 5)
  motion.update(100, true, false, 0)
  expect(pending.size).toBe(0)
  motion.update(99, true, false, 0)
  advance(32)
  expect(frame().impact).toBeUndefined()
})
