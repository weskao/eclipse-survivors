import { TAU } from '../constants'
import type { Artwork } from '../art'
import type { GameState, Hero, Mob } from '../types'
import type { Ctx2D } from './ctx'
import { softGlow } from './environment'

type Drawable = HTMLImageElement | HTMLCanvasElement

// Single, rigid sprite. The original segmented sprite bands tore at the waist
// and rotated armour/heads independently without a matching skeletal rig.
// Keep proportions, scale and ground contact consistent in every state.
export function drawRigSprite(ctx: Ctx2D, img: Drawable, sx: number, sy: number, e: Hero): void {
  const motion = Math.max(0, Math.min(1, e.moveAmount || 0))
  const stride = e.step || 0
  // A human walk has small vertical centre-of-mass movement; never bob in idle.
  const footLift = Math.abs(Math.sin(stride)) * 1.05 * motion
  const attackPhase = e.strike > 0 ? 1 - Math.min(1, e.strike / 0.29) : 0
  const recoil = e.strike > 0 ? Math.sin(attackPhase * Math.PI) * 1.1 : 0
  ctx.save()
  ctx.translate(-recoil, -footLift)
  ctx.drawImage(img, -sx / 2, -sy + 4, sx, sy)
  ctx.restore()
}

export function drawMobBody(ctx: Ctx2D, s: GameState, e: Mob, img: Drawable, sx: number, sy: number): void {
  const a = e.phase || s.worldClock
  if (e.type === 'slime') {
    const v = Math.sin(a * 2.2)
    ctx.translate(0, Math.max(-5, -Math.abs(v) * 5))
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
  e: Hero | Mob, ox: number, oy: number,
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
  ctx.save(); ctx.fillStyle = '#02070b70'; ctx.beginPath(); ctx.ellipse(x + 5, y + 5, sx * 0.32 * (1 + 0.12 * move), sy * 0.095, 0, 0, TAU); ctx.fill(); ctx.restore()
  if (hero) {
    softGlow(ctx, x, y, 72, '#efd69d30', 0.8)
    ctx.strokeStyle = '#f4de9d9f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y + 2, 35, 11, 0, 0, TAU); ctx.stroke()
    if (hero.dash > 0) {
      ctx.save(); ctx.strokeStyle = '#c9effa99'; ctx.lineWidth = 2; ctx.beginPath()
      ctx.ellipse(x, y + 2, 50 + Math.sin(s.worldClock * 28) * 4, 13, 0, 0, TAU); ctx.stroke(); ctx.restore()
    }
  }
  ctx.save(); ctx.translate(x, y)
  if (hero && hero.face < 0) ctx.scale(-1, 1)
  if (hero && hero.inv > 0 && Math.floor(s.worldClock * 17) % 2 === 0) ctx.globalAlpha = 0.55
  if (mob && mob.elite) ctx.filter = 'hue-rotate(75deg) saturate(1.5) brightness(1.1)'
  if (mob && mob.type === 'warlock') ctx.filter = 'hue-rotate(15deg) saturate(1.2)'
  if (mob && mob.hit > 0) ctx.filter = 'brightness(1.45) sepia(.35)'
  const im = art[kind === 'warlock' ? 'wizard' : kind]
  if (im && im.complete && im.naturalWidth) {
    if (hero) drawRigSprite(ctx, im, sx, sy, hero)
    else if (mob) drawMobBody(ctx, s, mob, im, sx, sy)
  } else {
    const fall = sprites[kind === 'golem' ? 'goblin' : kind === 'warlock' ? 'wizard' : kind]
    if (fall) ctx.drawImage(fall, -sx / 2, -sy + 4, sx, sy)
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
