import { TAU } from '../constants'
import type { Artwork } from '../art'
import type { GameState, Hero, Mob } from '../types'
import { sampleHeroAnimation, type HeroAnimation } from './animation'
import { getFiringOrigin } from '../weapon-geometry'
import { sampleWeaponRig } from './weapon-rig'
import { drawLoadedProjectile, drawRigidWeapon, getRigidWeaponLayers, type RigidWeaponLayers } from './rigid-weapons'
import type { HeroSheets } from './hero-sheets'
import { drawPaintedHero } from './painted-frames'
import type { Ctx2D } from './ctx'
import { softGlow } from './environment'

type Drawable = HTMLImageElement | HTMLCanvasElement
const ease = (n: number): number => {
  const t = Math.max(0, Math.min(1, n))
  return t * t * (3 - 2 * t)
}

/**
 * Articulate the original transparent illustration using shoulder/elbow/wrist
 * constraints rather than one rigid full-body translation. Small texture cells
 * preserve the face and costume while the original sword, bow and staff
 * are completely excluded from every warped body tile and drawn as rigid art.
 */
export function drawRigSprite(
  ctx: Ctx2D, img: Drawable, sx: number, sy: number, hero: Hero, anim: HeroAnimation, job: 'knight' | 'ranger' | 'wizard' = 'knight',
  preparedLayers?: RigidWeaponLayers,
  includeWeapon = true,
): void {
  const left = -sx / 2
  const top = -sy + 4
  const layers = preparedLayers ?? ('naturalWidth' in img ? getRigidWeaponLayers(img, job) : null)
  if (anim.reducedMotion) {
    ctx.drawImage(layers?.body ?? img, left, top, sx, sy)
    if (layers && includeWeapon) drawRigidWeapon(ctx, layers, job, hero, anim, sx, sy)
    return
  }
  if (!layers) {
    // Never deform equipment when no 2D canvas is available to isolate it.
    ctx.drawImage(img, left, top, sx, sy)
    return
  }
  const srcW = layers.body.width
  const srcH = layers.body.height
  const columns = 8
  const rows = 12
  const cw = sx / columns
  const ch = sy / rows
  const posed = sampleWeaponRig(job, hero, anim)
  const rest = sampleWeaponRig(job, hero, { ...anim, pose: 'idle', phase: 0 })
  const elbowX = posed.elbow.x - rest.elbow.x
  const elbowY = posed.elbow.y - rest.elbow.y
  const wristX = posed.hand.x - rest.hand.x
  const wristY = posed.hand.y - rest.hand.y
  const supportX = posed.supportHand.x - rest.supportHand.x
  const supportY = posed.supportHand.y - rest.supportHand.y
  const supportElbowX = posed.supportElbow.x - rest.supportElbow.x
  const supportElbowY = posed.supportElbow.y - rest.supportElbow.y
  const supportTurn = Math.atan2(posed.supportElbow.y - posed.supportShoulder.y, posed.supportElbow.x - posed.supportShoulder.x)
    - Math.atan2(rest.supportElbow.y - rest.supportShoulder.y, rest.supportElbow.x - rest.supportShoulder.x)
  const upperTurn = Math.atan2(posed.elbow.y - posed.shoulder.y, posed.elbow.x - posed.shoulder.x)
    - Math.atan2(rest.elbow.y - rest.shoulder.y, rest.elbow.x - rest.shoulder.x)
  const bladeTurn = posed.bladeAngle - ((anim.pose === 'attack' || anim.pose === 'cast') ? 0 : rest.bladeAngle)
  const walk = Math.sin(hero.step) * Math.max(0, Math.min(1, hero.moveAmount))
  const action = anim.pose === 'attack' || anim.pose === 'cast'
  const recoil = action ? Math.sin(Math.PI * anim.phase) : 0

  for (let row = 0; row < rows; row++) {
    const v = (row + 0.5) / rows
    const legs = ease((v - 0.60) / 0.34)
    const chest = ease((v - 0.20) / 0.19) * (1 - ease((v - 0.68) / 0.16))
    const head = 1 - ease((v - 0.08) / 0.25)
    for (let col = 0; col < columns; col++) {
      const u = (col + 0.5) / columns
      const side = 1 - u * 2
      // The image's weapon and casting arms occupy DIFFERENT sides by hero.
      // Skin original pixels once, so no extra sword / duplicate bow appears.
      const right = ease((u - 0.53) / 0.23) * ease((v - 0.16) / 0.15)
        * (1 - ease((v - 0.77) / 0.17))
      const leftArm = (1 - ease((u - 0.19) / 0.25)) * ease((v - 0.20) / 0.16)
        * (1 - ease((v - 0.73) / 0.15))
      const mainRight = job === 'ranger'
      const mainWeight = mainRight ? right : leftArm
      const supportWeight = mainRight ? leftArm : right
      const mainWrist = mainRight ? ease((u - 0.70) / 0.24) : 1 - ease((u - 0.14) / 0.27)
      const supportWrist = mainRight ? 1 - ease((u - 0.14) / 0.27) : ease((u - 0.70) / 0.24)
      const weapon = mainRight
        ? ease((u - 0.71) / 0.23) * ease((v - 0.08) / 0.13) * (1 - ease((v - 0.86) / 0.12))
        : (1 - ease((u - (job === 'wizard' ? 0.32 : 0.20)) / 0.21))
          * (job === 'wizard' ? 1 : ease((v - 0.26) / 0.17))
      let dx = mainWeight * (elbowX * (1 - mainWrist) + wristX * mainWrist) + weapon * wristX * 0.35
        + supportWeight * (supportElbowX * (1 - supportWrist) + supportX * supportWrist) * 0.55
      let dy = mainWeight * (elbowY * (1 - mainWrist) + wristY * mainWrist) + weapon * wristY * 0.35
        + supportWeight * (supportElbowY * (1 - supportWrist) + supportY * supportWrist) * 0.55
      const rotation = mainWeight * (upperTurn * (1 - mainWrist) + bladeTurn * mainWrist) * 0.55
        + weapon * bladeTurn * 0.28 + supportWeight * supportTurn * 0.35

      if (anim.pose === 'run') {
        dx += legs * side * walk * 4.3 - chest * walk * 1.6
        dy += legs * side * walk * 3.2 - (chest + head) * Math.abs(walk) * 1.1
      } else if (anim.pose === 'idle') {
        dx += Math.sin(anim.phase * TAU) * chest * 0.5
        dy -= Math.sin(anim.phase * TAU) * chest * 0.5
      } else if (action) {
        dx += chest * recoil * 2.4
        dy -= chest * recoil * 1.7
      } else if (anim.pose === 'dash') {
        dx += (1 - anim.phase) * (head * 5.6 + chest * 4.6)
        dy -= Math.sin(anim.phase * Math.PI) * (head + chest) * 2.8
      } else if (anim.pose === 'hurt') {
        dx += (1 - anim.phase) * (head * 4 + chest * 3.6)
      } else if (anim.pose === 'death') {
        dx += anim.phase * (head * 9 + chest * 4.5)
        dy += anim.phase * (head * 11 + chest * 5.5)
      } else if (anim.pose === 'victory') {
        dx += Math.sin(anim.phase * TAU) * (head * 1.3 + chest * 1.7)
        dy -= Math.sin(anim.phase * Math.PI) * chest * 3.6
      }
      // Rotate each skinned cell around its own center; the overlapping tiles
      // smoothly connect the bend while keeping source texels and transparency.
      if (Math.abs(rotation) < 0.001) {
        // Most cells are stationary: avoid Canvas save/rotate/restore on mobile.
        ctx.drawImage(layers.body, srcW * col / columns, srcH * row / rows, srcW / columns, srcH / rows,
          left + col * cw + dx - 0.45, top + row * ch + dy - 0.45, cw + 0.9, ch + 0.9)
      } else {
        ctx.save()
        ctx.translate(left + (col + 0.5) * cw + dx, top + (row + 0.5) * ch + dy)
        ctx.rotate(rotation)
        ctx.drawImage(layers.body, srcW * col / columns, srcH * row / rows, srcW / columns, srcH / rows,
          -cw / 2 - 0.45, -ch / 2 - 0.45, cw + 0.9, ch + 0.9)
        ctx.restore()
      }
    }
  }
  if (includeWeapon) drawRigidWeapon(ctx, layers, job, hero, anim, sx, sy)
}

/** Tiny aim-aligned accents trace the actual hand release, not a fixed screen spot. */
function drawPoseAccents(
  ctx: Ctx2D, kind: string, hero: Hero, anim: HeroAnimation,
): void {
  if (anim.reducedMotion || (anim.pose !== 'attack' && anim.pose !== 'cast' && anim.pose !== 'victory')) return
  // The projectile already exists in world space from the beginning of strike.
  // Do not draw a lingering held energy orb or a faux loaded arrow in recovery.
  if (anim.pose === 'cast' && anim.actionStage !== 'release') return
  const power = Math.max(0, Math.sin(Math.PI * anim.phase))
  const rig = sampleWeaponRig(kind as 'knight' | 'ranger' | 'wizard', hero, anim)
  if (anim.pose === 'cast') {
    const grip = getFiringOrigin('wizard', 1)
    ctx.save(); ctx.translate(grip.x, grip.y); ctx.rotate(rig.aim)
    ctx.strokeStyle = '#b6aaffb8'; ctx.lineWidth = 1.6; ctx.globalAlpha = power * 0.85
    ctx.beginPath(); ctx.ellipse(13 + power * 6, 0, 14 + power * 6, 6 + power * 2, anim.phase * TAU, 0, TAU); ctx.stroke()
    for (let i = 0; i < 4; i++) {
      const a = anim.phase * TAU + i * TAU / 4
      ctx.fillStyle = i % 2 ? '#c5ecff' : '#e7ceff'
      ctx.fillRect(18 + Math.cos(a) * 20, Math.sin(a) * 10, 2.5, 2.5)
    }
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = power * 0.6; ctx.strokeStyle = '#d5b6ff'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(rig.hand.x, rig.hand.y, 13, rig.bladeAngle - 1, rig.bladeAngle + 0.7); ctx.stroke()
    ctx.restore()
  } else if (anim.pose === 'attack' && kind === 'ranger' && anim.actionStage === 'release') {
    // Short bowstring rebound only: no shaft, duplicate arrow or lingering bow.
    const grip = getFiringOrigin('ranger', 1)
    ctx.save(); ctx.translate(grip.x, grip.y); ctx.rotate(rig.aim)
    ctx.strokeStyle = '#ffdf9b'; ctx.lineWidth = 1.1
    ctx.globalAlpha = Math.max(0, (0.22 - anim.phase) / 0.22) * 0.35
    ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(-4, 0); ctx.lineTo(-2, 12); ctx.stroke()
    ctx.restore()
  } else if (anim.pose === 'attack' && kind === 'knight') {
    ctx.save()
    ctx.globalAlpha = power * 0.7; ctx.strokeStyle = '#ffdb9c'; ctx.lineWidth = 2.6
    ctx.beginPath(); ctx.arc(rig.hand.x, rig.hand.y, 26, rig.bladeAngle - 0.85, rig.bladeAngle + 0.7); ctx.stroke()
    ctx.restore()
  } else if (anim.pose === 'victory') {
    ctx.save(); ctx.globalAlpha = 0.20 + power * 0.24
    ctx.strokeStyle = '#f5dfa8'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.ellipse(0, -65, 40, 72, 0, 0, TAU); ctx.stroke()
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
  e: Hero | Mob, ox: number, oy: number, reducedMotion = false, heroSheets?: HeroSheets,
  paintedFrames?: HTMLImageElement,
  paintedRunFrames?: HTMLImageElement,
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
  if (hero && hero.inv > 0 && !reducedMotion) ctx.globalAlpha = 0.75
  if (mob && mob.elite) ctx.filter = 'hue-rotate(75deg) saturate(1.5) brightness(1.1)'
  if (mob && mob.type === 'warlock') ctx.filter = 'hue-rotate(15deg) saturate(1.2)'
  if (mob && mob.hit > 0 && !reducedMotion) ctx.filter = 'brightness(1.3) sepia(.25)'
  const im = art[kind === 'warlock' ? 'wizard' : kind]
  const spriteKey = kind === 'golem' ? 'goblin' : kind === 'warlock' ? 'wizard' : kind
  const drawable = im && im.complete && im.naturalWidth ? im : sprites[spriteKey]
  if (drawable) {
    if (hero && anim && paintedFrames && drawPaintedHero(ctx, paintedFrames, s.choice, hero, anim, sx, sy, paintedRunFrames)) {
      // Complete prepainted pose includes its own rigid weapon; only live
      // world projectiles are drawn elsewhere, with no duplicated held arrow.
    } else if (hero && anim) {
      // Fallback: keep existing illustrated rendering until the atlas decodes.
      // The WebP is the authoritative artwork. Cache its direction/pose frames
      // once instead of skinning 96 texture cells on every gameplay draw.
      const layers = im && drawable === im ? getRigidWeaponLayers(drawable, s.choice) : null
      const prebaked = !!(heroSheets && im && drawable === im
        && heroSheets.draw(ctx, drawable, s.choice, hero, anim, sx, sy))
      ctx.save()
      if (hero.face < 0) ctx.scale(-1, 1)
      // Prebaked sheets contain the body ONLY. The exact current weapon angle
      // and pre-release arrow / charge are composited live in their own layers.
      if (prebaked) {
        if (layers) drawRigidWeapon(ctx, layers, s.choice, hero, anim, sx, sy)
      } else drawRigSprite(ctx, drawable, sx, sy, hero, anim, s.choice, layers ?? undefined)
      if (layers) drawLoadedProjectile(ctx, layers, s.choice, hero, anim, sx, sy)
      drawPoseAccents(ctx, kind, hero, anim)
      ctx.restore()
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
