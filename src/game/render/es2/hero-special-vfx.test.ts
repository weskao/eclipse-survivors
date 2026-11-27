import { describe, expect, it, vi } from 'vitest'
import { createEngine } from '../../engine'
import type { AudioSystem } from '../../audio/types'
import { createContentRegistry } from '../../content/registry'
import {
  HERO_AEGIS_SHATTER_SECONDS, createCombatVfxPack, emitCombatVfx, followHeroSpecialFx,
} from '../../content/packs/combat-vfx'
import { BALANCE } from '../../config'
import { createHero, createState } from '../../state'
import type { Mob } from '../../types'
import type { Ctx2D } from '../ctx'
import { COMBAT_FX_BY_KIND, COMBAT_FX_SPECS, type HeroSpecialFx } from './combat-vfx'
import { drawHeroSpecialFx, preloadHeroSpecialVfx } from './hero-special-vfx'

const mob = (x: number, y: number): Mob => ({
  x, y, hp: 9999, max: 9999, type: 'slime', r: 15, speed: 0, dmg: 0,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})

const specials = [
  ['knight', 'hero-knight', '#e8c084'],
  ['ranger', 'hero-ranger', '#c1e7a9'],
  ['wizard', 'hero-wizard', '#b9a2ff'],
  ['shadowblade', 'hero-shadowblade', '#c3b5c6'],
  ['spirit-summoner', 'hero-spirit-summoner', '#a0d9d6'],
  ['crimson-paladin', 'hero-crimson-paladin', '#d6b580'],
] as const

const audio = (): AudioSystem => ({
  unlocked: true, musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
  setMusicVolume() {}, setSfxVolume() {}, wake() {}, interrupt() {},
  setCombatIntensity() {}, playSfx() {}, tick() {}, onScreen() {},
  resetBattleClock() {}, toggleMusic: () => false, toggleSfx: () => false, dispose() {},
})

function canvas() {
  const calls: string[] = []
  const styles: Record<string, unknown> = { strokeStyle: '', fillStyle: '', globalAlpha: 1 }
  const ctx = new Proxy(styles, {
    get(target, key) {
      if (key in target) return target[String(key)]
      return (...args: unknown[]) => {
        if (key === 'stroke' || key === 'fill') calls.push(String(target[key === 'stroke' ? 'strokeStyle' : 'fillStyle']))
        else calls.push(String(key) + ':' + args.join(','))
      }
    },
    set(target, key, value) {
      target[String(key)] = value
      if (key === 'globalAlpha') calls.push('alpha:' + value)
      return true
    },
  }) as unknown as Ctx2D
  return { ctx, calls }
}

describe('six hero Q specials cinematic visuals', () => {
  it.each(specials)('%s only emits a dedicated bounded effect on a successful Q activation', (hero, kind) => {
    const engine = createEngine({ audio: audio() })
    engine.selectHero(hero)
    engine.start()
    const x = engine.state.hero!.x, y = engine.state.hero!.y
    expect(engine.activateHeroSpecial()).toBe(true)
    const specialFx = engine.state.content.effects.filter(fx => fx.id === 'combat-vfx:' + kind)
    expect(specialFx).toHaveLength(1)
    expect(specialFx[0]).toMatchObject({ x, y })
    expect(specialFx[0]!.life).toBeGreaterThan(0.8)
    expect(specialFx[0]!.life).toBeLessThanOrEqual(4)
    const before = engine.state.content.effects.length
    expect(engine.activateHeroSpecial()).toBe(false)
    expect(engine.state.content.effects).toHaveLength(before)
  })

  it.each(specials)('%s has an individual moving, readable motif and an accessible still', (_hero, kind, accent) => {
    const spec = COMBAT_FX_SPECS.find(item => item.kind === kind)
    expect(spec).toBeDefined()
    const s = createState()
    s.W = 840; s.H = 540; s.hero = createHero('knight')
    const full = createContentRegistry([createCombatVfxPack({ quality: 'high' })])
    expect(emitCombatVfx(fx => full.addEffect(s, fx), kind, 420, 270)).toBe(true)
    const opening = canvas()
    full.render(opening.ctx, s, 0, 0)
    full.tick(s, spec!.duration * 0.45, { end() {}, sfx() {}, message() {}, offerUpgrades() {} })
    const peak = canvas()
    full.render(peak.ctx, s, 0, 0)
    expect(peak.calls).toContain(accent)
    expect(opening.calls.join('|')).not.toBe(peak.calls.join('|'))
    const quiet = createContentRegistry([createCombatVfxPack({
      quality: 'low', reducedMotion: true, reducedFlashing: true,
    })])
    const still = canvas()
    quiet.render(still.ctx, s, 0, 0)
    expect(still.calls.some(call => call.startsWith('alpha:') && Number(call.slice(6)) > 0.55)).toBe(false)
    expect(still.calls.filter(call => call.startsWith('ellipse:')).length)
      .toBeLessThan(peak.calls.filter(call => call.startsWith('ellipse:')).length)
    full.tick(s, 4, { end() {}, sfx() {}, message() {}, offerUpgrades() {} })
    expect(s.content.effects).toHaveLength(0)
  })

  it('does not reintroduce a placeholder blade after the authored slash has faded', () => {
    const { ctx, calls } = canvas()
    drawHeroSpecialFx(ctx, 'hero-shadowblade', 0.98, 1, 12, false)
    expect(calls).not.toContain('#c3b5c6')
  })

  it('uses five cached textured art sprites and no per-frame gradient allocations', () => {
    let constructions = 0
    class FakeImage {
      complete = true
      naturalWidth = 512
      decoding = ''
      src = ''
      constructor() { constructions++ }
    }
    vi.stubGlobal('Image', FakeImage)
    try {
      preloadHeroSpecialVfx()
      preloadHeroSpecialVfx()
      expect(constructions).toBe(5)
      for (const [, kind] of specials) {
        const { ctx, calls } = canvas()
        drawHeroSpecialFx(ctx, kind, 0.42, 0.65, 12, false)
        expect(calls.some(call => call.startsWith('drawImage:'))).toBe(true)
        expect(calls.some(call => call.startsWith('createRadialGradient:'))).toBe(false)
        expect(calls.some(call => call.startsWith('createLinearGradient:'))).toBe(false)
      }
      expect(constructions).toBe(5)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each(['shadowblade', 'spirit-summoner'] as const)('%s carries the actually struck targets into its effect', hero => {
    const engine = createEngine({ audio: audio() })
    engine.selectHero(hero)
    engine.start()
    const h = engine.state.hero!
    engine.state.mobs.push(mob(h.x + 20, h.y), mob(h.x + 9000, h.y))
    expect(engine.activateHeroSpecial()).toBe(true)
    const fx = engine.state.content.effects.find(e => e.id === 'combat-vfx:hero-' + hero) as HeroSpecialFx
    expect(fx.targets).toContainEqual({ x: h.x + 20, y: h.y })
    expect(fx.targets).not.toContainEqual({ x: h.x + 9000, y: h.y })
    expect(fx.targets!.length).toBeLessThanOrEqual(3)
  })

  it('preserves all eight knight and six wizard contacts, but keeps the ranger capped at three', () => {
    const targets = Array.from({ length: 12 }, (_, i) => ({ x: i * 10, y: 0 }))
    for (const [kind, count] of [['hero-knight', 8], ['hero-wizard', 6], ['hero-ranger', 3]] as const) {
      const s = createState()
      const registry = createContentRegistry([createCombatVfxPack()])
      expect(emitCombatVfx(fx => registry.addEffect(s, fx), kind, 0, 0, { targets })).toBe(true)
      expect((s.content.effects[0] as HeroSpecialFx).targets).toHaveLength(count)
    }
  })

  it('keeps the Scarlet Aegis on the hero for the whole barrier and shatters it early on break', () => {
    expect(COMBAT_FX_BY_KIND.get('hero-crimson-paladin')!.duration)
      .toBe(BALANCE.heroes.specialEffects['crimson-paladin'].barrierSeconds)
    const engine = createEngine({ audio: audio() })
    engine.selectHero('crimson-paladin')
    engine.start()
    expect(engine.activateHeroSpecial()).toBe(true)
    const fx = engine.state.content.effects.find(e => e.id === 'combat-vfx:hero-crimson-paladin')!
    expect(fx.life).toBe(BALANCE.heroes.specialEffects['crimson-paladin'].barrierSeconds)
    engine.state.hero!.x += 64; engine.state.hero!.y -= 32
    engine.advance(0.016)
    expect(fx).toMatchObject({ x: engine.state.hero!.x, y: engine.state.hero!.y })

    const effects = [{ ...fx, life: 2.4 }]
    followHeroSpecialFx(effects, 'hero-crimson-paladin', 5, 6, true)
    expect(effects[0]).toMatchObject({ x: 5, y: 6, life: 2.4 })
    followHeroSpecialFx(effects, 'hero-crimson-paladin', 7, 8, false)
    expect(effects[0]).toMatchObject({ x: 7, y: 8, life: HERO_AEGIS_SHATTER_SECONDS })
    followHeroSpecialFx(effects, 'hero-crimson-paladin', 7, 8, false)
    expect(effects[0]!.life).toBe(HERO_AEGIS_SHATTER_SECONDS)
  })

  it('fires Crimson Retribution once from real enemy contact and shatters the Aegis on the same frame', () => {
    const cues: string[] = []
    const engine = createEngine({ audio: { ...audio(), playSfx: cue => { cues.push(cue) } } })
    engine.selectHero('crimson-paladin')
    engine.start()
    const h = engine.state.hero!
    engine.state.mobs = [{ ...mob(h.x + 8, h.y), dmg: 30 }]
    expect(engine.activateHeroSpecial()).toBe(true)
    const fx = engine.state.content.effects.find(e => e.id === 'combat-vfx:hero-crimson-paladin')!
    let elapsed = 0
    while (!cues.includes('crimson-paladin-retribution') && elapsed < 5) { engine.advance(0.016); elapsed += 0.016 }
    expect(cues.filter(cue => cue === 'crimson-paladin-retribution')).toHaveLength(1)
    expect(fx.life).toBeLessThanOrEqual(HERO_AEGIS_SHATTER_SECONDS)
    expect(engine.state.mobs[0]!.hp).toBeLessThan(9999)
    for (let i = 0; i < 120; i++) engine.advance(0.016)
    expect(cues.filter(cue => cue === 'crimson-paladin-retribution')).toHaveLength(1)
  })

  it('lets the GPU pass own a hero effect so the Canvas registry skips exactly that one', () => {
    const s = createState()
    s.W = 840; s.H = 540; s.hero = createHero('knight')
    const registry = createContentRegistry([createCombatVfxPack()])
    emitCombatVfx(fx => registry.addEffect(s, fx), 'hero-shadowblade', 420, 270)
    emitCombatVfx(fx => registry.addEffect(s, fx), 'sword-slash', 420, 270)
    const owned = s.content.effects[0]!
    const { ctx, calls } = canvas()
    registry.render(ctx, s, 0, 0, owned)
    expect(calls.filter(call => call.startsWith('translate:420,270'))).toHaveLength(1)
  })

  it('draws a Canvas fallback strike that actually reaches each struck target', () => {
    const s = createState()
    s.W = 840; s.H = 540; s.hero = createHero('knight')
    const registry = createContentRegistry([createCombatVfxPack()])
    expect(emitCombatVfx(fx => registry.addEffect(s, fx), 'hero-shadowblade', 420, 270,
      { targets: [{ x: 520, y: 300 }, { x: 380, y: 200 }] })).toBe(true)
    registry.tick(s, 0.3, { end() {}, sfx() {}, message() {}, offerUpgrades() {} })
    const { ctx, calls } = canvas()
    registry.render(ctx, s, 0, 0)
    expect(calls).toContain('lineTo:100,30')
    expect(calls).toContain('lineTo:-40,-70')
    expect(emitCombatVfx(() => true, 'hero-shadowblade', 0, 0, { targets: [{ x: NaN, y: 0 }] })).toBe(false)
  })

  it('keeps ranger fallback projectile positions tied to the real struck target', () => {
    const { ctx, calls } = canvas()
    drawHeroSpecialFx(ctx, 'hero-ranger', .3, .5, 12, false, {
      x: 420, y: 270, max: 1.35, life: .97, targets: [{ x: 560, y: 300 }],
    })
    expect(calls.some(call => call.startsWith('ellipse:140,54,'))).toBe(true)
  })

  it('culls all six cosmetic casts fully outside the viewport', () => {
    const s = createState()
    s.W = 800; s.H = 600; s.hero = createHero('wizard')
    const registry = createContentRegistry([createCombatVfxPack()])
    for (const [, kind] of specials)
      expect(emitCombatVfx(fx => registry.addEffect(s, fx), kind, -10000, -10000)).toBe(true)
    const { ctx, calls } = canvas()
    registry.render(ctx, s, 0, 0)
    expect(calls.some(call => call.startsWith('translate:'))).toBe(false)
  })
})
