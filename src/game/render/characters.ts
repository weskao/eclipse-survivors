import { TAU } from '../constants'
import type { Artwork } from '../art'
import type { GameState, Hero, Mob } from '../types'
import { sampleHeroAnimation, type HeroAnimation } from './animation'
import type { Ctx2D } from './ctx'
import { softGlow } from './environment'

type Drawable = HTMLImageElement | HTMLCanvasElement
const ease = (n: number): number => {
  const t = Math.max(0, Math.min(1, n))
  return t * t * (3 - 2 * t)
}

/**
 * Deform the original character illustration as a continuous, 2D mesh.
 * Neighboring cells overlap slightly and displacement is a smooth function
 * of their position; faces, costume and weapons never become separate limbs.
 * It is deliberately not a scale or bounce of a rigid full-body sprite.
 */
export function drawRigSprite(
  ctx: Ctx2D, img: Drawable, sx: number, sy: number, hero: Hero, anim: HeroAnimation,
): void {
  const left = -sx / 2
  const top = -sy + 4
  if (anim.reducedMotion) {
    ctx.drawImage(img, left, top, sx, sy)
    return
  }
  const srcW = ('naturalWidth' in img ? img.naturalWidth : img.width) || img.width || sx
  const srcH = ('naturalHeight' in img ? img.naturalHeight : img.height) || img.height || sy
  const bands = 12
  const columns = 4
  const cycle = Math.sin(anim.frame / anim.count * TAU)
  const contact = Math.max(0, Math.min(1, hero.moveAmount))
  const peak = Math.sin(Math.PI * anim.phase)
  for (let row = 0; row < bands; row++) {
    const v = (row + 0.5) / bands
    const boot = ease((v - 0.60) / 0.38)
    const chest = ease((v - 0.12) / 0.27) * (1 - ease((v - 0.68) / 0.22))
    const head = 1 - ease((v - 0.1) / 0.27)
    for (let col = 0; col < columns; col++) {
      const u = (col + 0.5) / columns
      const side = 1 - u * 2
      let dx = 0
      let dy = 0
      switch (anim.pose) {
        case 'idle':
          dx = Math.sin(anim.phase * TAU) * (chest * 0.6 + boot * side * 0.35)
          dy = -Math.sin(anim.phase * TAU) * chest * 0.5
          break
        case 'run':
          dx = cycle * contact * (boot * side * 3.5 - chest * 1.4)
          dy = boot * side * cycle * 3.0 - (chest + head) * Math.abs(cycle) * contact * 1.2
          break
        case 'attack':
          dx = peak * (chest * 4.2 + head * 1.8 - boot * 0.4)
          dy = -peak * chest * 2.6
          break
        case 'cast':
          dx = peak * (side * chest * 2.3 - boot * 0.4)
          dy = -peak * (head * 1.7 + chest * 2.4)
          break
        case 'dash':
          dx = (1 - anim.phase) * (head * 5.6 + chest * 4.6) - boot * 0.9
          dy = -Math.sin(anim.phase * Math.PI) * (head + chest) * 2.8
          break
        case 'hurt':
          dx = (1 - anim.phase) * (head * 4.0 + chest * 3.6)
          dy = anim.phase * head * 1.2
          break
        case 'death':
          dx = anim.phase * (head * 9 + chest * 4.5)
          dy = anim.phase * (head * 11 + chest * 5.5)
          break
        case 'victory':
          dx = Math.sin(anim.phase * TAU) * (head * 1.3 + chest * 1.7)
          dy = -Math.sin(anim.phase * Math.PI) * chest * 3.6
          break
      }
      ctx.drawImage(
        img,
        srcW * col / columns, srcH * row / bands, srcW / columns, srcH / bands,
        left + sx * col / columns + dx, top + sy * row / bands + dy,
        sx / columns + 0.8, sy / bands + 0.7,
      )
    }
  }
}

/** Tiny in-hand effects follow the action; there are no extra ghost limbs. */
function drawPoseAccents(ctx: Ctx2D, kind: string, sx: number, sy: number, anim: HeroAnimation): void {
  if (anim.reducedMotion || (anim.pose !== 'attack' && anim.pose !== 'cast' && anim.pose !== 'victory')) return
  const phase = anim.phase
  const power = Math.max(0, Math.sin(Math.PI * phase))
  if (anim.pose === 'cast') {
    ctx.save()
    ctx.strokeStyle = '#b6aaffb8'
    ctx.lineWidth = 1.6
    ctx.globalAlpha = power * 0.85
    const cy = -sy * 0.54
    ctx.beginPath(); ctx.ellipse(sx * 0.31, cy, 14 + power * 6, 6 + power * 2, phase * TAU, 0, TAU); ctx.stroke()
    for (let i = 0; i < 4; i++) {
      const a = phase * TAU + i * TAU / 4
      ctx.fillStyle = i % 2 ? '#c5ecff' : '#e7ceff'
      ctx.fillRect(sx * 0.31 + Math.cos(a) * 20, cy + Math.sin(a) * 10, 2.5, 2.5)
    }
    ctx.restore()
  } else if (anim.pose === 'attack') {
    ctx.save()
    ctx.globalAlpha = power * (kind === 'knight' ? 0.68 : 0.32)
    ctx.strokeStyle = kind === 'knight' ? '#ffdb9c' : '#d3f6d6'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(sx * 0.26, -sy * 0.49, 17, -1.9 + phase, 0.75 + phase)
    ctx.stroke()
    ctx.restore()
  } else if (anim.pose === 'victory') {
    ctx.save()
    ctx.globalAlpha = 0.20 + power * 0.24
    ctx.strokeStyle = '#f5dfa8'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.ellipse(0, -sy * 0.45, sx * 0.39, sy * 0.53, 0, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }
}

export function drawMobBody(ctx: Ctx2D, s: GameState, e: Mob, img: Drawable, sx: number, sy: number): void {
  const a = e.phase || s.worldClock
  if (e.type === 'slime') {
    const v = Math.sin(a * 2.2)
    const jumping = e.ai?.state === 'attack' && e.ai.attack === 'pounce'
    const lift = jumping ? Math.sin(Math.PI * (1 - Math.max(0, e.ai!.timer) / 0.26)) * 20 : Math.abs(v) * 5
    ctx.translate(0, -lift)
    ctx.scale(1 + v * 0.05, 1 - v * 0.07)
  } else if (e.type === 'bat') {
    ctx.translate(0, Math.sin(a * 1.9) * 9 - 4)
    ctx.scale(1 + Math.sin(a * 4.4) * 0.095, 1 - Math.sin(a * 4.4) * 0.14)
  } else if (e.type === 'goblin') {
    ctx.rotate(Math.sin(a * 1.3) * 0.065)
    ctx.translate(Math.sin(a * 1.8) * 2, -Math.abs(Math.sin(a * 1.8)) * 2)
  } else if (e.type === 'warlock') {
    ctx.translate(0, Math.sin(a * 1.4) * 5 - 5)
  } else if (e.type === 'golem') {
    ctx.rotate(Math.sin(a * 0.6) * 0.02)
    ctx.scale(1 + Math.sin(a * 0.72) * 0.012, 1 - Math.sin(a * 0.72) * 0.015)
  } else if (e.type === 'boss') {
    ctx.translate(0, Math.sin(a * 0.65) * 4)
    ctx.rotate(Math.sin(a * 0.43) * 0.018)
  }
  if ((e.stagger || 0) > 0) ctx.rotate(Math.sin(s.worldClock * 52) * 0.075)
  ctx.drawImage(img, -sx / 2, -sy + 4, sx, sy)
}

const DIMS: Record<string, [number, number]> = {
  knight: [108, 134], ranger: [111, 144], wizard: [117, 147], slime: [87, 75],
  bat: [114, 92], goblin: [92, 108], golem: [139, 134], warlock: [105, 127], boss: [236, 246],
}

export function drawCharacter(
  ctx: Ctx2D, s: GameState, art: Artwork, sprites: Record<string, HTMLCanvasElement>,
  e: Hero | Mob, ox: number, oy: number, reducedMotion = false,
): void {
  const { W, H } = s
  const mob = 'type' in e ? e : null
  const hero = 'type' in e ? null : e
  const x = e.x + ox
  const y = e.y + oy
  const kind = mob ? mob.type : s.choice
  if (x < -180 || x > W + 180 || y < -240 || y > H + 220) return
  const dims = DIMS[kind] || [86, 100]
  const sx = dims[0]!
  const sy = dims[1]!
  const move = hero ? hero.moveAmount : 1
  // Ground shadow is painted before the y-sorted body and never jumps with it.
  ctx.save()
  ctx.fillStyle = '#02070b70'
  ctx.beginPath()
  ctx.ellipse(x + 5, y + 5, sx * 0.32 * (1 + 0.12 * move), sy * 0.095, 0, 0, TAU)
  ctx.fill()
  if (mob?.type === 'boss') {
    // The persistent boss footprint complements the timed, dodgeable AI telegraphs.
    ctx.strokeStyle = '#ed9e7155'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(x, y + 5, mob.r + 15, (mob.r + 15) * 0.48, 0, 0, TAU); ctx.stroke()
  }
  ctx.restore()
  const anim = hero ? sampleHeroAnimation(s, hero, reducedMotion) : null
  if (hero) {
    const aura = s.cosmetic === 'knight-gilded' ? ['#edc66b55', '#ffe2a7c8']
      : s.cosmetic === 'ranger-moonlit' ? ['#86abf555', '#c7ddffca']
      : s.cosmetic === 'wizard-astral' ? ['#bc92fc66', '#e2c5ffca']
      : ['#efd69d30', '#f4de9d9f']
    softGlow(ctx, x, y, 72, aura[0]!, reducedMotion ? 0.4 : 0.8)
    ctx.strokeStyle = aura[1]!; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y + 2, 35, 11, 0, 0, TAU); ctx.stroke()
    if (hero.dash > 0 && !reducedMotion) {
      ctx.save(); ctx.strokeStyle = '#c9effa99'; ctx.lineWidth = 2; ctx.beginPath()
      ctx.ellipse(x, y + 2, 50 + Math.sin(s.worldClock * 28) * 4, 13, 0, 0, TAU); ctx.stroke(); ctx.restore()
    }
  }
  ctx.save(); ctx.translate(x, y)
  if (hero && hero.face < 0) ctx.scale(-1, 1)
  if (hero && hero.inv > 0 && !reducedMotion) ctx.globalAlpha = 0.75
  if (mob && mob.elite) ctx.filter = 'hue-rotate(75deg) saturate(1.5) brightness(1.1)'
  if (mob && mob.type === 'warlock') ctx.filter = 'hue-rotate(15deg) saturate(1.2)'
  if (mob && mob.hit > 0 && !reducedMotion) ctx.filter = 'brightness(1.3) sepia(.25)'
  const im = art[kind === 'warlock' ? 'wizard' : kind]
  const spriteKey = kind === 'golem' ? 'goblin' : kind === 'warlock' ? 'wizard' : kind
  const drawable = im && im.complete && im.naturalWidth ? im : sprites[spriteKey]
  if (drawable) {
    if (hero && anim) {
      drawRigSprite(ctx, drawable, sx, sy, hero, anim)
      drawPoseAccents(ctx, kind, sx, sy, anim)
    } else if (mob) drawMobBody(ctx, s, mob, drawable, sx, sy)
  }
  ctx.restore()
  if (mob && mob.hp < mob.max && mob.type !== 'boss') {
    const bar = Math.max(34, sx * 0.58)
    ctx.fillStyle = '#020608e6'; ctx.fillRect(x - bar / 2, y - sy - 8, bar, 5)
    ctx.fillStyle = '#d56b56'; ctx.fillRect(x - bar / 2 + 1, y - sy - 7, (bar - 2) * Math.max(0, mob.hp / mob.max), 3)
  }
  if (mob && mob.type === 'boss') {
    const bar = 190
    ctx.fillStyle = '#05090dec'; ctx.fillRect(x - bar / 2, y - sy - 25, bar, 12)
    ctx.strokeStyle = '#dcc391aa'; ctx.strokeRect(x - bar / 2, y - sy - 25, bar, 12)
    ctx.fillStyle = '#f09663'; ctx.fillRect(x - bar / 2 + 2, y - sy - 23, (bar - 4) * Math.max(0, mob.hp / mob.max), 8)
  }
}
