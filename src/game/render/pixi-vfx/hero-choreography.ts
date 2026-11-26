import type { ParticleKind } from './choreography'

/**
 * Pure, allocation-free choreography for the three hero Q casts. Every pose is a function of
 * (elapsed, life, struck targets) so the GPU pass can rebuild a frame from the simulation clock
 * without retaining particles. Coordinates are relative to the cast centre (hero chest).
 */
export type HeroSpecialKind = 'hero-shadowblade' | 'hero-spirit-summoner' | 'hero-crimson-paladin'
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
const STILL: Record<HeroSpecialKind, number> = { 'hero-shadowblade': 0.36, 'hero-spirit-summoner': 0.5, 'hero-crimson-paladin': 1 }

export function heroStrikeTime(kind: HeroSpecialKind, i: number): number {
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
  // Crimson Paladin: raise → sustain (ward + orbiting runes) → shatter outward.
  const raise = ease(e / 0.35), shatter = shatterOf(c)
  if (slot === 0) {
    return set(out, 0, -40, 0, 260 + raise * 60 + shatter * 120, 280 + raise * 50,
      0.38 * raise * (1 - shatter) * (r ? 1 : 0.85 + Math.sin(e * 3) * 0.15), 0xffe2b0, 'rays', true, r)
  }
  if (slot === 1) {
    return set(out, 0, 0, 0, 150 + raise * 40 + shatter * 90, 165 + raise * 44 + shatter * 90,
      0.88 * raise * (1 - shatter * 0.8), 0xffffff, 'ward', false, r)
  }
  if (slot < 8) {
    const k = slot - 2, a = k * TAU / 6 + e * 1.6
    const rad = 62 * raise + shatter * 140
    return set(out, Math.cos(a) * rad, Math.sin(a) * rad * 0.6, a + Math.PI / 2, 16, 26,
      0.9 * raise * (1 - shatter), 0xffc27a, 'crystal', true, r)
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
  const raise = ease(e / 0.35), shatter = shatterOf(c)
  const local = (e + slot * 0.137) % 1.2
  const rad = 50 + (slot % 4) * 8 + shatter * 160
  return set(out, Math.cos(a) * rad, Math.sin(a) * rad * 0.55 - local * 50, a, 6, 9,
    Math.sin(Math.PI * local / 1.2) * 0.7 * raise * (shatter ? 1 - shatter * 0.5 : 1), 0xff7a5c, 'ember', true, false)
}
