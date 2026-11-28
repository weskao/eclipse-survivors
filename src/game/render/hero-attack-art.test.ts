import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../state'
import { createFakeCtx } from './fakes'
import { drawHeroAuras, drawShots, drawSwipes } from './effects'
import { loadHeroAttackArt } from './hero-attack-art'
const sprites = loadHeroAttackArt(() => ({ complete: true, naturalWidth: 384 }) as HTMLImageElement)
describe('hero-specific combat textures', () => {
  it.each(['knight', 'shadowblade', 'crimson-paladin'] as const)('%s uses one textured melee draw, including reduced motion', id => {
    const s = createState(); resetRun(s); s.W = 800; s.H = 600; s.heroId = id
    s.swipes = [{ x: 100, y: 100, a: 0.5, life: 0.2, max: 0.29, r: 75 }]
    const before = JSON.stringify(s.swipes)
    for (const reduced of [false, true]) {
      const frame = createFakeCtx()
      drawSwipes(frame.ctx, s, 0, 0, sprites, reduced)
      expect(frame.drawn).toEqual([sprites[id]])
      expect(frame.calls).not.toContain('arc')
      expect(frame.calls).not.toContain('fillRect')
    }
    expect(JSON.stringify(s.swipes)).toBe(before)
    const off = createFakeCtx()
    drawSwipes(off.ctx, s, -5000, -5000, sprites)
    expect(off.drawn).toHaveLength(0)
  })
  it('replaces repeated fire and shield geometry with two authored textures', () => {
    const s = createState(); resetRun(s); s.W = 800; s.H = 600
    s.hero!.skills.blaze = 3; s.hero!.skills.shield = 2; s.hero!.levelAnim = 0
    const frame = createFakeCtx()
    drawHeroAuras(frame.ctx, s, s.hero!, 0, 0, false, sprites)
    expect(frame.drawn).toEqual([sprites['blaze-aura'], sprites['shield-aura']])
    expect(frame.calls).not.toContain('ellipse')
  })
  it('paints the spirit summoner projectile independently of the wizard fallback', () => {
    const s = createState(); resetRun(s); s.W = 800; s.H = 600; s.heroId = 'spirit-summoner'
    s.shots = [{ x: 100, y: 100, vx: 300, vy: 0, life: 1, d: 10, kind: 'magic', r: 9 }]
    const frame = createFakeCtx()
    drawShots(frame.ctx, s, 0, 0, null, undefined, false, sprites)
    expect(frame.drawn).toEqual([sprites['spirit-summoner']])
  })
})
