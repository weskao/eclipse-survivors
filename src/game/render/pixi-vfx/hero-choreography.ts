import type { ParticleKind } from './choreography'

/**
 * Pure, allocation-free choreography for all six hero Q casts. Every pose is a function of
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
export const HERO_TARGET_SLOTS = 8
export function heroTargetLimit(kind: string): number {
  return kind === 'hero-knight' ? 8 : kind === 'hero-wizard' ? 6 : 3
}
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
  if (kind === 'hero-knight') return .12
  if (kind === 'hero-wizard') return .42
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
    const charge = ease(e / .12), wave = ease((e - .12) / .48), tail = 1 - ease((e - .48) / .55)
    if (slot === 0) return set(out, 0, 24, 0, 90 + wave * 300, 42 + wave * 124, .72 * charge * tail * fade, 0xffd18b, 'rays', true, r)
    if (slot === 1) return set(out, 0, -32 + charge * 45, -.38 + charge * .8, 190 + charge * 95, 255, (1 - ease((e - .18) / .38)) * .98 * fade, 0xffe4aa, 'rift', true, r)
    if (slot < 5) {
      const angle = (slot - 2) * TAU / 3 + wave * .36
      return set(out, Math.cos(angle) * wave * 76, 24 + Math.sin(angle) * wave * 38, angle, 110 + wave * 240, 55 + wave * 75, charge * tail * .78 * fade, 0xffbd63, 'rift', true, r)
    }
    const target = c.targets[slot - 5]
    const hit = ease((e - .12) / .17), end = 1 - ease((e - .3) / .35)
    return !!target && set(out, target.x, target.y, 0, 62 + hit * 45, 80 + hit * 35, hit * end * fade, 0xffd59c, 'rays', true, r)
  }
  if (c.kind === 'hero-ranger') {
    if (slot < 9) {
      const i = Math.floor(slot / 3), layer = slot % 3, target = c.targets[i]
      if (!target) return false
      const local = e - heroStrikeTime(c.kind, i)
      if (local < 0 || local > .58) return false
      const u = ease(local / .22), angle = Math.atan2(target.y, target.x)
      const tail = 1 - ease((local - .22) / .30)
      if (layer === 0) return set(out, target.x * u, target.y * u, angle, 92, 13, tail * fade, 0xeaffc7, 'spark', true, r)
      if (layer === 1) return set(out, target.x * Math.max(0, u - .13), target.y * Math.max(0, u - .13), angle, 138, 27, .58 * tail * fade, 0x75d8a4, 'mist', true, r)
      const impact = ease((local - .18) / .09) * (1 - ease((local - .28) / .28))
      return set(out, target.x, target.y, angle, 68 + impact * 38, 68 + impact * 38, impact * fade, 0xeaffc7, 'rays', true, r)
    }
    return set(out, 0, -9, 0, 96, 116, .78 * (1 - ease(e / .82)) * fade, 0xa9e9b5, 'rays', true, r)
  }
  if (c.kind === 'hero-wizard') {
    const collapse = ease(e / .42), release = ease((e - .42) / .33), tail = 1 - ease((e - .68) / .75)
    if (slot === 0) return set(out, 0, 16, 0, 76 + release * 390, 50 + release * 230, .83 * tail * fade, 0xa384ff, 'rays', true, r)
    if (slot === 1) return set(out, 0, -18, e * .4, 138 - collapse * 62 + release * 70, 138 - collapse * 62 + release * 70, .88 * tail * fade, 0x201135, 'void', false, r)
    if (slot < 6) {
      const a = (slot - 2) * TAU / 4 + e * 3.4, rad = 135 * (1 - collapse) + release * 115
      return set(out, Math.cos(a) * rad, Math.sin(a) * rad * .68 - 10, a + Math.PI / 2, 96 + release * 110, 120 + release * 95, .76 * tail * fade, 0xc0a2ff, 'flame', true, r)
    }
    if (slot === 6) return set(out, 0, -20, -.2, 110 + release * 190, 220 + release * 130, release * tail * .85 * fade, 0xe3c6ff, 'rays', true, r)
    const target = c.targets[slot - 7]
    return !!target && set(out, target.x, target.y, e, 95 + release * 45, 105 + release * 55, release * tail * fade, 0xc6a5ff, 'flame', true, r)
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
  if (c.kind === 'hero-knight') {
    const u = (e - .12 - (slot % 5) * .014) / .82
    if (u < 0 || u > 1) return false
    const debris = slot % 3 === 0, dust = slot % 3 === 1
    const radius = (25 + 150 * ease(u)) * (.55 + (slot % 7) * .075)
    const lift = Math.sin(Math.PI * u) * (debris ? 55 : dust ? 20 : 90)
    return set(out, Math.cos(a) * radius, 24 + Math.sin(a) * radius * .68 - lift,
      a + u * 3, debris ? 13 : dust ? 24 : 6, debris ? 10 : dust ? 12 : 15,
      (1 - u) * .88 * fade, debris ? 0x9d794e : dust ? 0xbe9561 : 0xffd47d, debris ? 'crystal' : dust ? 'mist' : 'ember', !debris, false)
  }
  if (c.kind === 'hero-ranger') {
    const n = Math.min(3, c.targets.length)
    if (!n) return false
    const i = slot % n, target = c.targets[i]!
    const local = e - heroStrikeTime(c.kind, i), lag = (Math.floor(slot / n) % 6) * .019
    const u = (local - lag) / .22
    if (local < .26 && u >= 0 && u <= 1) {
      const travel = ease(u)
      return set(out, target.x * travel, target.y * travel, Math.atan2(target.y, target.x),
        25 - travel * 11, 4 + slot % 3, (1 - travel * .5) * .76 * fade, 0xbef7bb, 'spark', true, false)
    }
    const burst = (local - .22 - lag * .4) / .48
    if (burst < 0 || burst > 1) return false
    const d = ease(burst) * (24 + slot % 6 * 8)
    return set(out, target.x + Math.cos(a) * d, target.y + Math.sin(a) * d * .65 - burst * 22,
      a + burst, 7 + slot % 3, 12, (1 - burst) * .86 * fade, 0xd6ffc0, 'feather', true, false)
  }
  if (c.kind === 'hero-wizard') {
    if (e < .42) {
      const gather = ease(e / .42), angle = a + e * 7
      const radius = (75 + slot % 7 * 13) * (1 - gather) + 8
      return set(out, Math.cos(angle) * radius, Math.sin(angle) * radius * .75 - 10,
        angle + Math.PI / 2, 9 + slot % 4, 18, Math.sin(Math.PI * e / .48) * .88 * fade, 0xc5a5ff, 'void', true, false)
    }
    const u = (e - .42 - slot % 5 * .019) / .85
    if (u < 0 || u > 1) return false
    const d = ease(u) * (120 + slot % 7 * 17), crystal = slot % 3 === 0
    return set(out, Math.cos(a) * d, Math.sin(a) * d * .75 - Math.sin(Math.PI * u) * 35,
      a + u * 2, crystal ? 13 : 19, crystal ? 19 : 10, (1 - u) * .87 * fade, crystal ? 0xe3c5ff : 0x9776ed, crystal ? 'crystal' : 'void', true, false)
  }
  const shatter = shatterOf(c)
  const local = (e + slot * 0.137) % 1.2
  const rad = 50 + (slot % 4) * 8 + shatter * 160
  return set(out, Math.cos(a) * rad, Math.sin(a) * rad * 0.55 - local * 50, a, 6, 9,
    Math.sin(Math.PI * local / 1.2) * 0.7 * aegisLevel(c, e), 0xff7a5c, 'ember', true, false)
}
