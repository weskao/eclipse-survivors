import { describe, expect, it, vi } from 'vitest'
import { createFactionRuntime, spawnFactionEnemy } from './runtime'
import { drawFactionTelegraphs } from './telegraphs'

function mockCanvas() {
  const ctx = {
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
    lineTo: vi.fn(), arc: vi.fn(), stroke: vi.fn(), fill: vi.fn(),
    lineWidth: 0, strokeStyle: '', fillStyle: '', globalAlpha: 1,
  }
  return ctx
}

describe('faction Canvas 2D telegraph adapter', () => {
  it('draws a locked sentinel warning line without changing game state', () => {
    const runtime = createFactionRuntime()
    const sentinel = spawnFactionEnemy(runtime, 'crystal-sentinel', 80, 40)!
    sentinel.state = 'windup'; sentinel.facingX = 1; sentinel.facingY = 0
    const before = JSON.stringify(runtime)
    const canvas = mockCanvas()
    drawFactionTelegraphs(canvas as unknown as CanvasRenderingContext2D, runtime, 0, 0)
    expect(canvas.moveTo).toHaveBeenCalledWith(80, 40)
    expect(canvas.lineTo).toHaveBeenCalledWith(480, 40)
    expect(canvas.stroke).toHaveBeenCalled()
    expect(canvas.save).toHaveBeenCalledTimes(1)
    expect(canvas.restore).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(runtime)).toBe(before)
  })

  it('shows delayed hazard circles and all other enemy windups with no gradients', () => {
    const runtime = createFactionRuntime()
    for (const kind of ['shadow-assassin', 'plague-carrier', 'fire-imp', 'shield-guardian'] as const) {
      const enemy = spawnFactionEnemy(runtime, kind, 20, 10)!
      enemy.state = 'windup'; enemy.aimX = 40; enemy.aimY = 35
    }
    runtime.zones.push({ x: 42, y: 28, radius: 75, damage: 9, life: 1,
      delay: 0.3, interval: 0.65, tick: 0, status: 'poison', sourceId: 1, kind: 'plague-carrier' })
    const canvas = mockCanvas()
    drawFactionTelegraphs(canvas as unknown as CanvasRenderingContext2D, runtime, 10, 5)
    expect(canvas.arc).toHaveBeenCalled()
    expect(canvas.stroke.mock.calls.length).toBeGreaterThanOrEqual(5)
    expect(canvas.save).toHaveBeenCalledTimes(1)
    expect(canvas.restore).toHaveBeenCalledTimes(1)
  })
})
