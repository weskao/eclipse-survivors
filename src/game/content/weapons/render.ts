import type { Ctx2D } from '../../render/ctx'
import type { GameState } from '../../types'
import { runtimeOf } from './runtime'
import { drawProjectileSprite, type ProjectileSprites } from '../../render/projectile-art'
import { drawZoneMotes, drawEnergyTrail } from '../../render/energy-art'
import { sharedHeroAttackArt } from '../../render/hero-attack-art'

const MISSILE_ART = {
  dagger: 'shadow-dagger', lance: 'holy-lance', bone: 'bone-spear',
  blade: 'ricochet-blade', arrow: 'spectral-arrow',
} as const

const MISSILE_COLOR = {
  dagger: '#be9dff', lance: '#ffe2a0', bone: '#e2e7e3',
  blade: '#7edafa', arrow: '#d9aaff',
} as const

/** Renders one bounded FX dispatcher per active run; no draw-time enemy scans. */
export function drawArsenal(ctx: Ctx2D, state: GameState, ox: number, oy: number, sprites?: Partial<ProjectileSprites>): void {
  const hero = state.hero
  if (!hero) return
  const r = runtimeOf(state)
  const art = sharedHeroAttackArt()
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const inside = (x: number, y: number, margin = 160) =>
    state.W <= 0 || state.H <= 0 ||
    (x >= -margin && y >= -margin && x <= state.W + margin && y <= state.H + margin)

  for (const z of r.zones) {
    const x = z.x + ox, y = z.y + oy
    if (!inside(x, y, z.radius)) continue
    ctx.save()
    ctx.globalAlpha = z.kind === 'mine' ? 0.72 : Math.min(0.45, z.life * 0.17)
    ctx.strokeStyle = z.kind === 'mine' ? '#f5b7fa' : '#9cebb0'
    ctx.fillStyle = z.kind === 'mine' ? '#9e61ce55' : '#44bd7780'
    ctx.lineWidth = z.kind === 'mine' ? 3 : 2
    ctx.beginPath(); ctx.arc(x, y, z.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    // Static embers distinguish the spell surface without adding a motion dependency.
    drawZoneMotes(ctx, x, y, z.radius, 0, 0, z.kind === 'mine' ? '#f5b7fa' : '#c5f5bd')
    if (z.kind === 'mine') {
      const fuse = Math.max(0.12, z.fuse / 0.85)
      ctx.beginPath(); ctx.arc(x, y, 9 + 16 * (1 - fuse), 0, Math.PI * 2); ctx.stroke()
      ctx.save()
      ctx.translate(x, y)
      if (fuse > 0.25) ctx.rotate(state.worldClock * 0.7)
      drawProjectileSprite(ctx, sprites, 'arcane-mine', 58)
      ctx.restore()
    } else {
      ctx.beginPath(); ctx.arc(x, y, Math.max(10, z.radius * 0.55), 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }

  for (const link of r.links) {
    if (link.from.hp <= 0 || link.to.hp <= 0) continue
    const mx = (link.from.x + link.to.x) / 2
    const my = (link.from.y + link.to.y) / 2
    if (!inside(mx + ox, my + oy)) continue
    ctx.save()
    ctx.globalAlpha = Math.min(0.9, link.life / 0.8)
    ctx.strokeStyle = '#a5e799'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(link.from.x + ox, link.from.y + oy)
    ctx.lineTo(link.to.x + ox, link.to.y + oy); ctx.stroke()
    ctx.lineWidth = 1; ctx.strokeStyle = '#ecffce'
    ctx.beginPath(); ctx.moveTo(link.from.x + ox, link.from.y + oy - 4)
    ctx.lineTo(link.to.x + ox, link.to.y + oy - 4); ctx.stroke()
    ctx.restore()
  }

  for (const p of r.projectiles) {
    const x = p.x + ox, y = p.y + oy
    if (!inside(x, y, 55)) continue
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.atan2(p.vy, p.vx) + (p.kind === 'blade' ? state.worldClock * 5 : 0))
    const painted = drawProjectileSprite(ctx, sprites, MISSILE_ART[p.kind],
      p.kind === 'lance' ? 76 : p.kind === 'arrow' ? 62 : p.kind === 'bone' ? 54 : 48)
    ctx.strokeStyle = MISSILE_COLOR[p.kind]
    ctx.shadowColor = painted ? 'transparent' : MISSILE_COLOR[p.kind]
    ctx.shadowBlur = painted ? 0 : 10
    if (!painted) {
      ctx.fillStyle = MISSILE_COLOR[p.kind]
      ctx.lineWidth = p.kind === 'lance' || p.kind === 'arrow' ? 4 : 2.5
      ctx.beginPath()
      if (p.kind === 'dagger' || p.kind === 'blade') {
        ctx.moveTo(15, 0); ctx.lineTo(0, -7); ctx.lineTo(-12, 0); ctx.lineTo(0, 7); ctx.closePath()
        ctx.fill()
      } else {
        const length = p.kind === 'lance' ? 41 : p.kind === 'arrow' ? 37 : 25
        ctx.moveTo(-length, 0); ctx.lineTo(13, 0); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(6, -6); ctx.lineTo(6, 6); ctx.closePath(); ctx.fill()
      }
    }
    drawEnergyTrail(ctx, p.radius, p.life, MISSILE_COLOR[p.kind], reduced)
    ctx.restore()
  }

  for (const wolf of r.wolves) {
    const x = wolf.x + ox, y = wolf.y + oy
    if (!inside(x, y, 35)) continue
    ctx.save(); ctx.translate(x, y)
    const image = art.wolf
    if (image?.complete && image.naturalWidth > 0) {
      const facing = wolf.x >= hero.x ? 1 : -1
      ctx.scale(facing, 1)
      const bob = reduced ? 0 : Math.sin(state.worldClock * 9 + wolf.x * 0.04) * 2
      ctx.drawImage(image, -43, -48 + bob, 86, 86)
      ctx.restore()
      continue
    }
    ctx.fillStyle = '#8ac6e1c9'
    ctx.strokeStyle = '#e2efff'
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-8, -22); ctx.lineTo(0, -10)
    ctx.lineTo(5, -23); ctx.lineTo(13, -7); ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#f9fcff'
    ctx.fillRect(7, -6, 3, 2)
    ctx.restore()
  }

  const gravityLevel = state.content.levels['weapons:gravity-orbs'] ?? 0
  if (gravityLevel) {
    const count = Math.min(3, 1 + Math.floor(gravityLevel / 2))
    for (let i = 0; i < count; i++) {
      const angle = state.worldClock * 2.8 + i * Math.PI * 2 / count
      const x = hero.x + ox + Math.cos(angle) * 72
      const y = hero.y + oy + Math.sin(angle) * 72
      if (!inside(x, y, 35)) continue
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(state.worldClock * 2.2)
      if (!drawProjectileSprite(ctx, sprites, 'gravity-core', 43)) {
        ctx.fillStyle = '#7357c9'; ctx.strokeStyle = '#d5c2ff'
        ctx.lineWidth = 3; ctx.shadowColor = '#ab8cff'; ctx.shadowBlur = 15
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      ctx.restore()
    }
  }

  if (r.slashLife > 0) {
    ctx.save()
    ctx.globalAlpha = r.slashLife / 0.3
    const image = art['crimson-paladin']
    if (image?.complete && image.naturalWidth > 0) {
      ctx.translate(hero.x + ox, hero.y + oy)
      ctx.rotate(r.slashAngle)
      ctx.drawImage(image, -172, -172, 344, 344)
    } else {
      ctx.fillStyle = '#e97c99'
      ctx.beginPath(); ctx.arc(hero.x + ox, hero.y + oy, 150, r.slashAngle - 1.35, r.slashAngle + 1.35)
      ctx.arc(hero.x + ox, hero.y + oy, 126, r.slashAngle + 1.35, r.slashAngle - 1.35, true)
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }

  if (r.charge > 0) {
    const x = hero.x + ox, y = hero.y + oy
    ctx.save(); ctx.globalAlpha = Math.min(0.65, 0.25 + 0.4 * (1 - r.charge))
    ctx.strokeStyle = '#ffdb7b'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(r.beamAngle) * 690, y + Math.sin(r.beamAngle) * 690); ctx.stroke()
    ctx.restore()
  }
  if (r.beam && r.beam.life > 0) {
    const b = r.beam
    const x = b.x + ox, y = b.y + oy
    ctx.save(); ctx.globalAlpha = Math.min(1, b.life * 2.5)
    ctx.strokeStyle = '#ffb94f'; ctx.shadowColor = '#ffda76'; ctx.shadowBlur = 23
    ctx.lineCap = 'round'; ctx.lineWidth = b.width * 2
    ctx.beginPath(); ctx.moveTo(x, y)
    ctx.lineTo(x + b.ux * b.range, y + b.uy * b.range); ctx.stroke()
    ctx.strokeStyle = '#fff8cd'; ctx.lineWidth = Math.max(5, b.width * 0.65)
    ctx.beginPath(); ctx.moveTo(x, y)
    ctx.lineTo(x + b.ux * b.range, y + b.uy * b.range); ctx.stroke()
    ctx.restore()
  }
}
