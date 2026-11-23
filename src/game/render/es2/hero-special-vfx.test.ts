import { describe, expect, it } from 'vitest'
import { createEngine } from '../../engine'
import type { AudioSystem } from '../../audio/types'
import { createContentRegistry } from '../../content/registry'
import { createCombatVfxPack, emitCombatVfx } from '../../content/packs/combat-vfx'
import { createHero, createState } from '../../state'
import type { Ctx2D } from '../ctx'
import { COMBAT_FX_SPECS } from './combat-vfx'

const specials = [
  ['shadowblade', 'hero-shadowblade', '#bea0ff'],
  ['spirit-summoner', 'hero-spirit-summoner', '#8cecff'],
  ['crimson-paladin', 'hero-crimson-paladin', '#ffd99b'],
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

describe('three hero Q specials cinematic visuals', () => {
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
    expect(still.calls.filter(call => call.startsWith('lineTo:')).length)
      .toBeLessThan(peak.calls.filter(call => call.startsWith('lineTo:')).length)
    full.tick(s, 4, { end() {}, sfx() {}, message() {}, offerUpgrades() {} })
    expect(s.content.effects).toHaveLength(0)
  })

  it('culls all three cosmetic casts fully outside the viewport', () => {
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
