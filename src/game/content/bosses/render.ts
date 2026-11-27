import type { Ctx2D } from '../../render/ctx'
import type { BossSnapshot, BossTelegraph, BossImpact, BossProjectile } from './controller'
import { BOSS_ATTACKS, type BossAttackId, type BossId } from './definitions'
import { ATTACK_PRESENTATION } from './attack-presentation'
import { drawBossParticles, type ParticleBudget } from './cinematic-particles'
import { drawEnergyMissile } from '../../render/energy-art'
import type { ProjectileArtId, ProjectileSprites } from '../../render/projectile-art'
import type { VisualPresentationPolicy } from '../accessibility/presentation'

import { ATTACK_ART } from './attack-art'
const MATERIAL_ART = import.meta.glob('../../../assets/es2/production/skills/boss-materials/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export type BossMaterialKind = 'abyss' | 'frost' | 'infernal' | 'seraph'
export type BossMaterialSprites = Partial<Record<BossMaterialKind, HTMLImageElement>>
let sharedMaterials: BossMaterialSprites | undefined
export function bossMaterialKind(id: BossAttackId): BossMaterialKind {
  if (id === 'void-fan' || id === 'shadow-sweep' || id === 'eclipse-wedge' || id === 'twilight-ground') return 'abyss'
  const boss = ATTACK_PRESENTATION[id].boss
  return boss === 'abyss-monarch' ? 'abyss' : boss === 'frost-sovereign' ? 'frost' : boss === 'infernal-titan' ? 'infernal' : 'seraph'
}
export function loadBossMaterialSprites(makeImage: () => HTMLImageElement = () => new Image()): BossMaterialSprites {
  const result: BossMaterialSprites = {}
  for (const [path, url] of Object.entries(MATERIAL_ART)) {
    const kind = path.split('/').pop()!.replace('.png', '') as BossMaterialKind
    const image = makeImage(); image.decoding = 'async'; image.src = url
    result[kind] = image
  }
  return result
}
const PROJECTILE_ART = import.meta.glob('../../../assets/es2/production/skills/boss-projectiles/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export type BossAttackSprites = Partial<Record<BossAttackId, HTMLImageElement>>
let sharedArt: BossAttackSprites | undefined
let sharedMissiles: BossAttackSprites | undefined
function loadSprites(sources: Record<string, string>, makeImage: () => HTMLImageElement): BossAttackSprites {
  const result: BossAttackSprites = {}
  for (const [path, url] of Object.entries(sources)) {
    const id = path.split('/').pop()!.replace(/(@3x\.webp|\.svg)$/, '') as BossAttackId
    const image = makeImage(); image.decoding = 'async'; image.src = url
    result[id] = image
  }
  return result
}
export function loadBossAttackSprites(makeImage: () => HTMLImageElement = () => new Image()): BossAttackSprites {
  return loadSprites(ATTACK_ART, makeImage)
}
export function loadBossProjectileSprites(makeImage: () => HTMLImageElement = () => new Image()): BossAttackSprites {
  return loadSprites(PROJECTILE_ART, makeImage)
}
export function preloadBossAttackArt(): BossAttackSprites | undefined {
  if (typeof Image === 'undefined') return undefined
  sharedMaterials ??= loadBossMaterialSprites()
  sharedMissiles ??= loadBossProjectileSprites()
  return sharedArt ??= loadBossAttackSprites()
}
/** GPU and Canvas share the existing preloaded HTML image sources; no second asset download. */
export function bossVfxImages() {
  preloadBossAttackArt()
  return { attacks: sharedArt, missiles: sharedMissiles, materials: sharedMaterials }
}
function ready(id: string, sprites?: BossAttackSprites): HTMLImageElement | undefined {
  const img = sprites?.[id as BossAttackId]
  return img?.complete && img.naturalWidth > 0 ? img : undefined
}
const TAU = Math.PI * 2
const SAFE = Math.PI / 5
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const PALETTES: Record<BossId, { core: string; edge: string; muted: string }> = {
  'abyss-monarch': { core: '#e8d0ff', edge: '#a76af6', muted: '#39205c' },
  'frost-sovereign': { core: '#efffff', edge: '#86dcff', muted: '#295d87' },
  'infernal-titan': { core: '#fff1c3', edge: '#ff9a55', muted: '#722c19' },
  'eclipse-seraph': { core: '#fff6dd', edge: '#f5ce83', muted: '#7d4d8e' },
}
type Palette = (typeof PALETTES)[BossId]
const MISSILE_ART: Record<BossId, ProjectileArtId> = {
  'abyss-monarch': 'enemy-hex', 'frost-sovereign': 'arcane-bolt',
  'infernal-titan': 'enemy-ember', 'eclipse-seraph': 'holy-lance',
}
type Settings = Pick<VisualPresentationPolicy, 'quality' | 'reduceFlashing' | 'vfxOpacity'>
function particleBudget(reduced: boolean, settings?: Settings, release = false): ParticleBudget {
  return { remaining: reduced || settings?.vfxOpacity === 0 ? 0 : settings?.quality === 'low' ? (release ? 24 : 16) : settings?.quality === 'medium' ? (release ? 48 : 32) : release ? 88 : 64 }
}
function visible(t: BossTelegraph, ox: number, oy: number, w: number, h: number, margin = 28): boolean {
  const x = t.x + ox, y = t.y + oy
  if (t.shape === 'beam') {
    const ex = x + Math.cos(t.angle) * t.length, ey = y + Math.sin(t.angle) * t.length
    const pad = t.width + margin
    return Math.max(x, ex) >= -pad && Math.min(x, ex) <= w + pad && Math.max(y, ey) >= -pad && Math.min(y, ey) <= h + pad
  }
  const r = t.radius + margin
  return x + r >= 0 && x - r <= w && y + r >= 0 && y - r <= h
}
/** Local coordinates: beam heading or safe wedge points right. Exact collision boundary, including beam endcaps. */
function boundary(ctx: Ctx2D, t: BossTelegraph): void {
  ctx.beginPath()
  if (t.shape === 'beam') {
    ctx.moveTo(0, -t.width); ctx.lineTo(t.length, -t.width)
    ctx.arc(t.length, 0, t.width, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(0, t.width); ctx.arc(0, 0, t.width, Math.PI / 2, Math.PI * 1.5)
  } else if (t.shape === 'arena') {
    ctx.moveTo(0, 0); ctx.arc(0, 0, t.radius, SAFE, TAU - SAFE)
  } else {
    ctx.arc(0, 0, t.radius, 0, TAU)
    if (t.shape === 'ring' && t.innerRadius > 0) {
      ctx.moveTo(t.innerRadius, 0); ctx.arc(0, 0, t.innerRadius, 0, TAU, true)
    }
  }
  ctx.closePath()
}
function orient(ctx: Ctx2D, t: BossTelegraph, ox: number, oy: number): void {
  ctx.translate(t.x + ox, t.y + oy)
  if (t.shape === 'beam') ctx.rotate(t.angle)
  else if (t.shape === 'arena') ctx.rotate(t.safeAngle)
}
function material(ctx: Ctx2D, t: BossTelegraph, image: HTMLImageElement | undefined, palette: Palette, progress: number, reduced: boolean): void {
  if (image) {
    if (t.shape === 'beam') {
      ctx.drawImage(image, -t.width, -t.width, t.length + t.width * 2, t.width * 2)
    } else {
      // Keep original masks anchored to the actual annulus/sector; only disk materials may expand.
      const scale = t.shape === 'circle' && !reduced ? 0.86 + progress * 0.14 : 1
      const r = t.radius * scale
      ctx.drawImage(image, -r, -r, r * 2, r * 2)
    }
  } else {
    ctx.fillStyle = palette.muted
    ctx.fill('evenodd')
  }
}
/** Baked fluid/crystal/lava/feather surface. All transforms are inside the authoritative clip;
 * the distinct attack-specific overlay is a separate accent, not a duplicate surface. */
function drawMaterialLayer(ctx: Ctx2D, t: BossTelegraph, id: BossAttackId, progress: number, reduced: boolean,
  stage: 'warning' | 'active' | 'release', materials?: BossMaterialSprites): boolean {
  if (!materials || !ATTACK_PRESENTATION[id]) return false
  const kind = bossMaterialKind(id), image = materials[kind]
  if (!image?.complete || image.naturalWidth <= 0) return false
  ctx.save()
  try {
    if (t.shape === 'beam') {
      const w = t.length + t.width * 2
      ctx.drawImage(image, -t.width, -t.width, w, t.width * 2)
    } else {
      const collapse = kind === 'abyss' && (ATTACK_PRESENTATION[id].visual === 'collapse' || ATTACK_PRESENTATION[id].visual === 'vortex')
      const motion = reduced ? 0.5 : progress
      const scale = t.shape !== 'circle' ? 1 : stage === 'warning' ? 0.72 + motion * 0.28
        : collapse ? 1.06 - motion * 0.18 : 0.88 + motion * 0.12
      if (!reduced && kind !== 'infernal') ctx.rotate((kind === 'abyss' ? -1.3 : kind === 'seraph' ? 0.45 : 0.12) * motion)
      const r = t.radius * scale
      ctx.drawImage(image, -r, -r, r * 2, r * 2)
    }
  } finally { ctx.restore() }
  return true
}
function telegraph(ctx: Ctx2D, t: BossTelegraph, ox: number, oy: number, palette: Palette, reduced: boolean,
  w: number, h: number, art: BossAttackSprites | undefined, budget: ParticleBudget, settings: Settings | undefined, releaseOwnsMaterial: boolean, materials?: BossMaterialSprites): void {
  if (!visible(t, ox, oy, w, h)) return
  const id = t.attackId as BossAttackId, attack = BOSS_ATTACKS[id], profile = ATTACK_PRESENTATION[id]
  const progress = clamp(t.progress ?? 0), active = t.stage === 'active'
  const strength = settings?.vfxOpacity ?? 1
  ctx.save()
  try {
    orient(ctx, t, ox, oy)
    boundary(ctx, t)
    // Functional warning layer never disappears, even at VFX Off.
    ctx.fillStyle = t.harmless ? palette.muted : t.color
    ctx.globalAlpha = t.harmless ? 0.07 : active ? 0.12 : 0.08 + progress * 0.13
    ctx.fill('evenodd')
    ctx.strokeStyle = t.harmless ? '#b6edc2' : palette.edge
    ctx.globalAlpha = reduced ? 0.66 : 0.58 + progress * 0.22
    ctx.lineWidth = 1.8
    ctx.stroke()
    if (releaseOwnsMaterial || strength <= 0) return
    ctx.clip('evenodd')
    const image = attack?.kind === 'projectile' ? undefined : ready(id, art)
    ctx.globalAlpha = strength * (settings?.reduceFlashing ? 0.25 : reduced ? 0.24 : active ? 0.47 : 0.14 + progress * 0.33)
    const baked = drawMaterialLayer(ctx, t, id, progress, reduced, active ? 'active' : 'warning', materials)
    if (image) {
      if (baked) ctx.globalAlpha *= 0.58
      material(ctx, t, image, palette, progress, reduced)
    }
    if (profile && !reduced) drawBossParticles(ctx, t, profile, active ? 'active' : 'warning', progress, budget, palette.edge, palette.core)
  } finally { ctx.restore() }
}
function projectile(ctx: Ctx2D, p: BossProjectile, ox: number, oy: number, palette: Palette, reduced: boolean, w: number, h: number, fallback: ProjectileArtId, sprites?: Partial<ProjectileSprites>, settings?: Settings): void {
  const x = p.x + ox, y = p.y + oy, margin = Math.max(48, p.radius * 4.6)
  if (x < -margin || y < -margin || x > w + margin || y > h + margin) return
  ctx.save()
  ctx.translate(x, y); ctx.rotate(Math.atan2(p.vy, p.vx))
  ctx.globalAlpha = settings?.reduceFlashing ? 0.72 : 0.94
  const image = p.attackId ? ready(p.attackId, sharedMissiles) : undefined
  if (image) {
    // The head lies at the projectile's authoritative world position; tail trails backwards.
    const r = p.radius
    ctx.drawImage(image, -r * 4.5, -r * 1.25, r * 5.7, r * 2.5)
  } else drawEnergyMissile(ctx, sprites, fallback, Math.max(2, p.radius), p.life, palette.edge, palette.core, reduced)
  ctx.restore()
}
export function drawBossTelegraphs(ctx: Ctx2D, snapshot: BossSnapshot, ox: number, oy: number,
  reduced = false, w = Infinity, h = Infinity, sprites?: Partial<ProjectileSprites>, art = sharedArt, settings?: Settings, materials = art === sharedArt ? sharedMaterials : undefined, skipProjectiles = false, skipDecorations = false): void {
  if (!snapshot.id) return
  const palette = PALETTES[snapshot.id], budget = particleBudget(reduced, settings)
  ctx.save()
  try {
    for (const t of snapshot.telegraphs) {
      const releaseOwnsMaterial = t.stage === 'active' && !!snapshot.impacts?.some(i => i.life > 0 && i.attackId === t.attackId && i.x === t.x && i.y === t.y && i.angle === t.angle)
      telegraph(ctx, t, ox, oy, palette, reduced, w, h, art, budget, settings, releaseOwnsMaterial || skipDecorations, materials)
    }
    if (!skipProjectiles) for (const p of snapshot.projectiles) projectile(ctx, p, ox, oy, palette, reduced, w, h, MISSILE_ART[snapshot.id], sprites, settings)
  } finally { ctx.restore() }
}
function impact(ctx: Ctx2D, t: BossImpact, ox: number, oy: number, palette: Palette, reduced: boolean, w: number, h: number, art: BossAttackSprites | undefined, budget: ParticleBudget, settings?: Settings, materials?: BossMaterialSprites): void {
  if (t.life <= 0 || t.max <= 0 || (settings?.vfxOpacity ?? 1) <= 0) return
  const id = t.attackId as BossAttackId, attack = BOSS_ATTACKS[id], profile = ATTACK_PRESENTATION[id]
  if (!attack || !profile) return
  const launch = attack.kind === 'projectile'
  // Only the actual launch origin receives a flash, never an instant impact along a missile trajectory.
  if (launch ? (t.x + ox < -110 || t.x + ox > w + 110 || t.y + oy < -110 || t.y + oy > h + 110) : !visible(t, ox, oy, w, h, 50)) return
  const progress = clamp(1 - t.life / t.max), strength = settings?.vfxOpacity ?? 1
  const local: BossTelegraph = launch ? { ...t, shape: 'circle', radius: 42 + 13 * profile.weight, innerRadius: 0 } : t
  ctx.save()
  try {
    orient(ctx, t, ox, oy)
    boundary(ctx, local)
    ctx.clip('evenodd')
    const fade = (1 - progress) ** 1.2
    ctx.globalAlpha = strength * Math.min(settings?.reduceFlashing || reduced ? 0.43 : 0.84, (0.65 + profile.weight * 0.21) * fade)
    const baked = drawMaterialLayer(ctx, local, id, progress, reduced, 'release', materials)
    const detail = ready(id, art)
    if (detail || !baked) {
      if (baked) ctx.globalAlpha *= 0.62
      material(ctx, local, detail, palette, progress, reduced)
    }
    if (!reduced) {
      ctx.globalAlpha *= 0.83
      drawBossParticles(ctx, local, profile, 'release', progress, budget, palette.edge, palette.core)
    }
  } finally { ctx.restore() }
}
export function drawBossImpacts(ctx: Ctx2D, snapshot: BossSnapshot, ox: number, oy: number,
  reduced = false, w = Infinity, h = Infinity, art = sharedArt, settings?: Settings, materials = art === sharedArt ? sharedMaterials : undefined): void {
  if (!snapshot.id || !snapshot.impacts?.length) return
  const palette = PALETTES[snapshot.id], budget = particleBudget(reduced, settings, true)
  ctx.save()
  try { for (const t of snapshot.impacts) impact(ctx, t, ox, oy, palette, reduced, w, h, art, budget, settings, materials) }
  finally { ctx.restore() }
}
