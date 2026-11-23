import { describe, expect, it } from 'vitest'
import {
  PRODUCTION_HERO_DETAIL_SOURCES,
  productionHeroDetailRect,
  productionHeroDetailReady,
  drawProductionHeroFrame,
  loadProductionHeroes,
} from './production-heroes'
import type { HeroAnimation } from '../animation'
import type { Ctx2D } from '../ctx'

function animation(overrides: Partial<HeroAnimation> = {}): HeroAnimation {
  return { pose: 'idle', frame: 0, count: 8, phase: 0, direction: 0, reducedMotion: false, ...overrides }
}
const ids = ['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const

describe('new three-asset hero animation packs (4x4 / 4x4 / 4x2)', () => {
  it('maps all nine distinct local 3x images to the actual hero identity', () => {
    const all = ids.flatMap(id => {
      const images = PRODUCTION_HERO_DETAIL_SOURCES[id]
      expect(images.idleReady).toContain(id + '/idle-ready@3x.webp')
      expect(images.runAttack).toContain(id + '/run-attack@3x.webp')
      expect(images.special).toContain(id + '/special@3x.webp')
      return Object.values(images)
    })
    expect(new Set(all).size).toBe(9)
  })

  it('selects all eight real facing-specific idle and guard frames with exact 448px crops', () => {
    for (let direction = 0; direction < 8; direction++) {
      expect(productionHeroDetailRect(animation({ direction }))).toEqual({
        kind: 'idleReady', x: (direction % 4) * 448,
        y: Math.floor(direction / 4) * 448, width: 448, height: 448, mirror: false,
      })
      expect(productionHeroDetailRect(animation({ direction, pose: 'attack' })).kind).toBe(
        direction === 0 || direction === 4 ? 'runAttack' : 'idleReady',
      )
      if (direction !== 0 && direction !== 4) {
        expect(productionHeroDetailRect(animation({ direction, pose: 'attack' })).y)
          .toBe((Math.floor(direction / 4) + 2) * 448)
      }
    }
  })

  it('maps two rows of run, two rows of attack, and eight distinct special frames', () => {
    for (let frame = 0; frame < 8; frame++) {
      const run = productionHeroDetailRect(animation({ pose: 'run', frame }))
      expect([run.kind, run.x, run.y]).toEqual(['runAttack', (frame % 4) * 448, Math.floor(frame / 4) * 448])
      const attack = productionHeroDetailRect(animation({ pose: 'attack', phase: frame / 8 }))
      expect([attack.kind, attack.x, attack.y]).toEqual(['runAttack', (frame % 4) * 448, (2 + Math.floor(frame / 4)) * 448])
      const special = productionHeroDetailRect(animation({ pose: 'cast', special: true, phase: frame / 8 }))
      expect([special.kind, special.x, special.y]).toEqual(['special', (frame % 4) * 448, Math.floor(frame / 4) * 448])
    }
    const west = productionHeroDetailRect(animation({ pose: 'run', direction: 4 }))
    expect(west.mirror).toBe(true)
    const reduced = productionHeroDetailRect(animation({ pose: 'attack', direction: 7, reducedMotion: true }))
    expect(reduced.kind).toBe('idleReady')
    expect(reduced.y).toBe(448)
  })

  it('lazy-loads only the selected pose asset and draws the exact cell, without per-frame image allocations', () => {
    const made: Array<HTMLImageElement> = []
    const images = loadProductionHeroes(() => {
      const value = { complete: true, naturalWidth: 900, naturalHeight: 900, src: '' } as HTMLImageElement
      made.push(value)
      return value
    })
    expect(made).toHaveLength(3)
    const hero = images.shadowblade as HTMLImageElement & { detailImages: Record<string, HTMLImageElement> }
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args), save: () => {},
      restore: () => {}, scale: () => {}, translate: () => {} } as unknown as Ctx2D
    // First call triggers asynchronous image decoding; retain the portrait until ready.
    expect(drawProductionHeroFrame(ctx, hero, animation(), 108, 134)).toBe(true)
    expect(made).toHaveLength(4)
    expect(productionHeroDetailReady(hero, animation())).toBe(false)
    hero.detailImages.idleReady.naturalWidth = 1792
    hero.detailImages.idleReady.naturalHeight = 1792
    expect(productionHeroDetailReady(hero, animation())).toBe(true)
    calls.length = 0
    expect(drawProductionHeroFrame(ctx, hero, animation({ direction: 6 }), 108, 134)).toBe(true)
    expect(calls[0]!.slice(1, 5)).toEqual([896, 448, 448, 448])
    expect(made).toHaveLength(4)
  })
})
