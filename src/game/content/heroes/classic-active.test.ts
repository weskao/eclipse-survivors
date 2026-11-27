import { describe, expect, it, vi } from 'vitest'
import { createHero, createState } from '../../state'
import { createClassicHeroActive, CLASSIC_ACTIVE_DEFINITIONS, getHeroActiveDefinition } from './classic-active'
import { HERO_DEFINITIONS } from './index'
import { createFactionBridge } from '../enemies/integration'
import type { GameHooks, Mob } from '../../types'
const hooks = (): GameHooks => ({ sfx: vi.fn(), end: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn() })
const mob = (x: number, y: number): Mob => ({ x, y, hp: 999, max: 999, type: 'slime', r: 15, speed: 0, dmg: 0, phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0 })
describe('classic hero active skills', () => {
  it('uses distinct icons and cast sounds for all six heroes', () => {
    const all = [...Object.values(CLASSIC_ACTIVE_DEFINITIONS), ...Object.values(HERO_DEFINITIONS)]
    expect(new Set(all.map(x => x.specialIconSrc)).size).toBe(6)
    expect(new Set(all.map(x => x.audio.special)).size).toBe(6)
    for (const id of ['knight', 'ranger', 'wizard'] as const) expect(getHeroActiveDefinition(id)).toBe(CLASSIC_ACTIVE_DEFINITIONS[id])
  })
  it.each(['knight', 'ranger', 'wizard'] as const)('%s respects range, cooldown, pause and death, without replacing the classic hero', id => {
    const s = createState(); s.mode = 'play'; s.hero = createHero(id); s.heroId = id
    const h = s.hero, fx = hooks(), a = createClassicHeroActive(s, id, fx)
    const near = mob(h.x + 15, h.y), far = mob(h.x + 9999, h.y)
    s.mobs = [near, far]; a.reset()
    expect(s.hero).toBe(h)
    expect(a.activate()).toBe(true); expect(near.hp).toBeLessThan(999); expect(far.hp).toBe(999)
    expect(a.castTargets()).toContainEqual({ x: h.x + 15, y: h.y })
    expect(a.activate()).toBe(false)
    expect(vi.mocked(fx.sfx).mock.calls.filter(([cue]) => cue === CLASSIC_ACTIVE_DEFINITIONS[id].audio.special)).toHaveLength(1)
    s.mode = 'paused'; const cd = a.snapshot().cooldown; a.tick(10); expect(a.snapshot().cooldown).toBe(cd)
    s.mode = 'play'; a.tick(cd); expect(a.snapshot().cooldown).toBe(0)
    a.reset(); expect(a.castTargets()).toEqual([])
    h.hp = 0; expect(a.activate()).toBe(false)
  })
  it('ranger picks the three closest targets across classic and faction pools', () => {
    const s = createState(); s.mode = 'play'; s.hero = createHero('ranger'); s.heroId = 'ranger'
    const h = s.hero, fx = hooks(), bridge = createFactionBridge({ random: () => .5 })
    const legacy = [10, 30, 50, 70].map(n => mob(h.x + n, h.y)); s.mobs = legacy
    const faction = bridge.spawn(s, 'shadow-assassin', h.x + 20, h.y)!
    expect(faction).not.toBeNull(); const hp = faction.hp
    expect(createClassicHeroActive(s, 'ranger', fx, bridge).activate()).toBe(true)
    expect(faction.hp).toBeLessThan(hp); expect(legacy[0]!.hp).toBeLessThan(999)
    expect(legacy[1]!.hp).toBeLessThan(999); expect(legacy[2]!.hp).toBe(999)
  })
})
