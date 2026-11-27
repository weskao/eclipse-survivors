import type { ParticleKind } from './choreography'

/**
 * Pure, allocation-free choreography for the three hero Q casts. Every pose is a function of
 * (elapsed, life, struck targets) so the GPU pass can rebuild a frame from the simulation clock
 * without retaining particles. Coordinates are relative to the cast centre (hero chest).
 */
export type HeroSpecialKind = 'hero-knight' | 'hero-ranger' | 'hero-wizard' | 'hero-shadowblade' | 'hero-spirit-summoner' | 'hero-crimson-paladin'
export type HeroArtTexture = 'rift' | 'flame' | 'guardian' | 'ward' | 'rays'
export interface HeroCast {
  kind: HeroSpecialKind
  elapsed: number
  life: number
  targets: readonly { readonly x: number; readonly y: number }[]
  reduced: boolean
}
export interface HeroPose {
  x: number; y: number; rotation: number; width: number; height: number; alpha: number
  tint: number; texture: HeroArtTexture | ParticleKind; additive: boolean
}

export const HERO_ART_SLOTS = 10
export const HERO_MOTE_SLOTS = 40
/** Aegis shatter window: the last seconds of the barrier effect. */
export const AEGIS_SHATTER = 0.35

const TAU = Math.PI * 2
const GOLDEN = 2.39996
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t) }
// Shadowblade cut cadence matches the three transients of the existing cast sample.
const SHADOW_FIRST = 0.04, SHADOW_STEP = 0.13, CUT_LIFE = 0.45
const SPIRIT_GATHER = 0.22, SPIRIT_ARRIVE = 0.45
// Reduced motion freezes each cast on its most readable key pose.
const STILL: Record<HeroSpecialKind, number> = { 'hero-knight': .32, 'hero-ranger': .27, 'hero-wizard': .48, 'hero-shadowblade': 0.36, 'hero-spirit-summoner': 0.5, 'hero-crimson-paladin': 1 }

export function heroStrikeTime(kind: HeroSpecialKind, i: number): number {
  if (kind === 'hero-ranger') return .06 + i * .08
  if (kind === 'hero-shadowblade') return SHADOW_FIRST + SHADOW_STEP * i
  return kind === 'hero-spirit-summoner' ? SPIRIT_ARRIVE : 0.35
}

export function heroMoteBudget(reduced: boolean, quality?: string): number {
  if (reduced) return 0
  return quality === 'low' ? 12 : quality === 'medium' ? 24 : HERO_MOTE_SLOTS
}

function set(
  out: HeroPose, x: number, y: number, rotation: number, width: number, height: number,
  alpha: number, tint: number, texture: HeroPose['texture'], additive: boolean, reduced: boolean,
): boolean {
  const a = Math.min(reduced ? 0.55 : 1, clamp(alpha))
  if (a <= 0.01) return false
  out.x = x; out.y = y; out.rotation = rotation; out.width = width; out.height = height
  out.alpha = a; out.tint = tint; out.texture = texture; out.additive = additive
  return true
}

const time = (c: HeroCast) => c.reduced ? STILL[c.kind] : c.elapsed
const endFade = (c: HeroCast) => clamp(c.life / 0.2)
const shatterOf = (c: HeroCast) => c.reduced ? 0 : clamp(1 - c.life / AEGIS_SHATTER)
// Aegis beats: full-strength cast for ~1.2 s (on par with the other heroes), then a dim hold.
const AEGIS_HOLD_FROM = 1, AEGIS_HOLD_RAMP = 0.4, AEGIS_HOLD_LEVEL = 0.42
/** Aegis intensity: raise → hold → full retribution flash fading out across the shatter. */
function aegisLevel(c: HeroCast, e: number): number {
  if (!c.reduced && c.life <= AEGIS_SHATTER) return 1 - shatterOf(c)
  return ease(e / 0.35) * (1 - (1 - AEGIS_HOLD_LEVEL) * ease((e - AEGIS_HOLD_FROM) / AEGIS_HOLD_RAMP))
}

/** Spirit wisp i: gathers beside the hero, then arcs to its target (or the guardian if none). */
function wisp(c: HeroCast, i: number, e: number, out: { x: number; y: number }): void {
  const a = i * TAU / 3 - Math.PI / 2 + e * 2.4
  const hx = Math.cos(a) * 40, hy = Math.sin(a) * 20 - 18
  const u = ease((e - SPIRIT_GATHER) / (SPIRIT_ARRIVE - SPIRIT_GATHER))
  const t = c.targets[i]
  const tx = t ? t.x : 0, ty = t ? t.y : -70
  const lift = Math.sin(Math.PI * u) * 46 // arc over the crowd; zero at both ends
  out.x = hx + (tx - hx) * u
  out.y = hy + (ty - hy) * u - lift
}
const scratch = { x: 0, y: 0 }

export function heroArtPose(out: HeroPose, c: HeroCast, slot: number): boolean {
  if (slot < 0 || slot >= HERO_ART_SLOTS) return false
  const e = time(c), fade = endFade(c), r = c.reduced
  if (c.kind === 'hero-shadowblade') {
    const n = Math.min(3, c.targets.length)
    if (slot < 6) {
      const i = slot >> 1, k = slot & 1, t = c.targets[i]
      if (!t || i >= n) return false
      const local = e - heroStrikeTime(c.kind, i)
      if (local < 0 || local > CUT_LIFE) return false
      const grow = ease(local / 0.12)
      const rot = (k ? 0.95 : -0.62) + (i % 2 ? 0.4 : 0) + (k ? -1 : 1) * local * 0.6
      return set(out, t.x, t.y, rot, 120 + grow * 70, 118 + grow * 40,
        (1 - ease((local - 0.16) / (CUT_LIFE - 0.16))) * 0.95 * fade, k ? 0xd9c8ff : 0xa58bff, 'rift', true, r)
    }
    if (slot < 8) {
      // Return cut: two crossed blades on the hero after the final blink.
      const local = e - heroStrikeTime(c.kind, n || 0)
      if (local < 0 || local > 0.5) return false
      const k = slot - 6, grow = ease(local / 0.14)
      return set(out, 0, 0, (k ? 0.8 : -0.8) + (k ? -1 : 1) * local * 0.4, 160 + grow * 80, 150,
        (1 - ease((local - 0.2) / 0.3)) * 0.9 * fade, 0xc9b6ff, 'rift', true, r)
    }
    if (slot === 8) {
      // Departure shadow left where the hero vanished.
      return set(out, 0, 0, 0, 120, 120, (1 - ease(e / 0.3)) * 0.6 * fade, 0x2a1a3c, 'void', false, r)
    }
    return false
  }
  if (c.kind === 'hero-spirit-summoner') {
    if (slot < 3) {
      wisp(c, slot, e, scratch)
      const burst = ease((e - SPIRIT_ARRIVE) / 0.25)
      const alpha = e < SPIRIT_ARRIVE ? 0.5 + ease(e / 0.18) * 0.45 : 0.95 * (1 - burst)
      const s = 1 + burst * 0.7
      return set(out, scratch.x, scratch.y, Math.sin(e * 6 + slot) * 0.12, 54 * s, 72 * s,
        alpha * fade, 0x9ff5ec, 'flame', true, r)
    }
    if (slot === 3) {
      const rise = ease((e - 0.3) / 0.3)
      return set(out, 0, -30 - rise * 34, 0, 118 + rise * 24, 160 + rise * 30,
        rise * 0.85 * fade, 0xffffff, 'guardian', true, r)
    }
    if (slot === 4) {
      const bloom = ease((e - SPIRIT_ARRIVE) / 0.2)
      return set(out, 0, -10, 0, 90 + bloom * 50, 110 + bloom * 60,
        bloom * 0.7 * fade, 0x8ff0e6, 'flame', true, r)
    }
    return false
  }
  if (c.kind === 'hero-knight') {
    const u = ease(e / .3), release = 1 - ease((e - .28) / .65)
    if (slot === 0) return set(out, 0, 18, 0, 140 + u * 250, 100 + u * 150, .6 * release * fade, 0xffd18b, 'rays', true, r)
    if (slot < 5) return set(out, 0, 18, slot * TAU / 4 + u * .5, 130 + u * 230, 100 + u * 110, .9 * release * fade, 0xffc078, 'rift', true, r)
    return false
  }
  if (c.kind === 'hero-ranger') {
    if (slot < 6) {
      const i = slot >> 1, target = c.targets[i]
      if (!target) return false
      const local = e - heroStrikeTime(c.kind, i)
      if (local < 0 || local > .6) return false
      const u = ease(local / .24), angle = Math.atan2(target.y, target.x)
      if (slot % 2 === 0) return set(out, target.x * u, target.y * u, angle + Math.PI / 2, 28, 115, (1 - ease((local - .24) / .36)) * fade, 0xd8ffb0, 'rift', true, r)
      return set(out, target.x, target.y, angle, 90, 90, Math.sin(Math.PI * ease((local - .15) / .45)) * fade, 0xeaffc7, 'rays', true, r)
    }
    if (slot === 6) return set(out, 0, 0, 0, 110, 110, .65 * (1 - ease(e / .6)) * fade, 0xa9e9b5, 'rays', true, r)
    return false
  }
  if (c.kind === 'hero-wizard') {
    const collapse = ease(e / .42), release = ease((e - .42) / .33), tail = 1 - ease((e - .66) / .7)
    if (slot === 0) return set(out, 0, 0, 0, 125 + release * 325, 140 + release * 280, .8 * tail * fade, 0xa384ff, 'rays', true, r)
    if (slot < 5) {
      const a = slot * TAU / 4 + e * 2, rad = 135 * (1 - collapse) + release * 70
      return set(out, Math.cos(a) * rad, Math.sin(a) * rad * .65, a, 85 + collapse * 85, 100 + release * 115, .8 * tail * fade, 0xc0a2ff, 'flame', true, r)
    }
    if (slot === 5) return set(out, 0, 0, 0, 96 + collapse * 50, 96 + collapse * 50, .8 * tail * fade, 0x2c174f, 'void', false, r)
    return false
  }
  // Crimson Paladin: raise → cast → dim hold (ward + orbiting runes) → retribution shatter outward.
  const raise = ease(e / 0.35), shatter = shatterOf(c), level = aegisLevel(c, e)
  const bursting = !r && c.life <= AEGIS_SHATTER
  if (slot === 0) {
    // God-rays belong to the cast and the burst only; they leave during the hold.
    const rays = bursting ? level : raise * (1 - ease((e - 0.9) / 0.4))
    return set(out, 0, -40, 0, 260 + raise * 60 + shatter * 120, 280 + raise * 50,
      0.38 * rays * (r ? 1 : 0.85 + Math.sin(e * 3) * 0.15), 0xffe2b0, 'rays', true, r)
  }
  if (slot === 1) {
    return set(out, 0, 0, 0, 150 + raise * 40 + shatter * 90, 165 + raise * 44 + shatter * 90,
      0.88 * level, 0xffffff, 'ward', false, r)
  }
  if (slot < 8) {
    const k = slot - 2, a = k * TAU / 6 + e * 1.6
    const rad = 62 * raise + shatter * 140
    return set(out, Math.cos(a) * rad, Math.sin(a) * rad * 0.6, a + Math.PI / 2, 16, 26,
      0.9 * level, 0xffc27a, 'crystal', true, r)
  }
  return false
}

export function heroMotePose(out: HeroPose, c: HeroCast, slot: number): boolean {
  if (c.reduced || slot < 0 || slot >= HERO_MOTE_SLOTS) return false
  const e = c.elapsed, fade = endFade(c), a = slot * GOLDEN
  if (c.kind === 'hero-shadowblade') {
    // Void spray thrown off each cut, along a fixed golden-angle direction per slot.
    const n = Math.min(3, c.targets.length)
    const t = n ? c.targets[slot % n]! : null
    const local = e - heroStrikeTime(c.kind, n ? slot % n : 0) - (slot / 3 | 0) * 0.008
    const u = local / 0.5
    if (u < 0 || u > 1) return false
    const d = u * (30 + (slot % 5) * 10)
    return set(out, (t?.x ?? 0) + Math.cos(a) * d, (t?.y ?? 0) + Math.sin(a) * d * 0.7, a, 7, 7,
      (1 - u) * 0.85 * fade, 0xb08cff, 'void', true, false)
  }
  if (c.kind === 'hero-spirit-summoner') {
    if (e < SPIRIT_ARRIVE) {
      // Soul trail behind each travelling wisp.
      const lagged = e - (slot / 3 | 0) * 0.015
      if (lagged < SPIRIT_GATHER) return false
      wisp(c, slot % 3, lagged, scratch)
      return set(out, scratch.x, scratch.y, 0, 6, 6, 0.6 - (slot / 3 | 0) * 0.04, 0x9ff5ec, 'spark', true, false)
    }
    // Heal motes rise around the hero.
    const local = e - SPIRIT_ARRIVE - (slot % 8) * 0.03
    const u = local / 0.7
    if (u < 0 || u > 1) return false
    const rad = (16 + (slot % 5) * 7) * (1 - u * 0.3)
    return set(out, Math.cos(a) * rad, Math.sin(a) * rad * 0.4 - 10 - u * 40, 0, 8, 8,
      Math.sin(Math.PI * u) * 0.9 * fade, 0x8ff0e6, 'mist', true, false)
  }
  if (c.kind === 'hero-knight' || c.kind === 'hero-ranger' || c.kind === 'hero-wizard') {
    const wizard = c.kind === 'hero-wizard', ranger = c.kind === 'hero-ranger'
    const local = e - (wizard ? .36 : .06) - (slot % 6) * .025, u = local / .7
    if (u < 0 || u > 1) return false
    const t = ranger && c.targets.length ? c.targets[slot % c.targets.length] : undefined
    const rad = u * (ranger ? 40 : wizard ? 220 : 170) * (.55 + (slot % 5) * .1)
    return set(out, (t?.x ?? 0) + Math.cos(a) * rad, (t?.y ?? 0) + Math.sin(a) * rad * .65 - u * 28,
      a, 6 + slot % 3, 11 + slot % 4, (1 - u) * .82 * fade, wizard ? 0xc3a5ff : ranger ? 0xcaf7ac : 0xffbd6c, wizard ? 'void' : ranger ? 'feather' : 'ember', true, false)
  }
  const shatter = shatterOf(c)
  const local = (e + slot * 0.137) % 1.2
  const rad = 50 + (slot % 4) * 8 + shatter * 160
  return set(out, Math.cos(a) * rad, Math.sin(a) * rad * 0.55 - local * 50, a, 6, 9,
    Math.sin(Math.PI * local / 1.2) * 0.7 * aegisLevel(c, e), 0xff7a5c, 'ember', true, false)
}
