import { TAU } from '../constants'
import { BALANCE } from '../config'
import { drawEnemyRelease } from './enemy-motion'
import type { GameState, Mob } from '../types'
import type { Ctx2D } from './ctx'
import type { ProjectileSprites } from './projectile-art'
import { drawEnergyMissile, drawZoneMotes } from './energy-art'

function warning(ctx: Ctx2D, mob: Mob, ox: number, oy: number, reduced: boolean): void {
  const ai = mob.ai
  if (!ai || ai.state !== 'windup') return
  const time = Math.min(1, ai.timer / (BALANCE.enemies.ai.windup[ai.attack] + (mob.type === 'boss' ? BALANCE.enemies.ai.bossWindupExtra : 0)))
  const boss = mob.type === 'boss'
  const color = mob.elite ? '#dc9cff' : boss ? '#ff7758' : '#ffbf76'
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = boss ? 3.5 : 2.5
  ctx.globalAlpha = 0.55 + (1 - time) * 0.35
  ctx.setLineDash([8, 5])
  if (ai.attack === 'slam' || ai.attack === 'pounce' || ai.attack === 'jab') {
    const radius = ai.attack === 'slam' ? (boss ? 117 : mob.elite ? 101 : 88) : 43
    const x = ai.aimX + ox, y = ai.aimY + oy
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke()
    ctx.globalAlpha = 0.1 + (1 - time) * 0.17
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill()
    ctx.globalAlpha = 0.65
    drawZoneMotes(ctx, x, y, radius, 0, 1 - time, color, reduced)
  } else if (ai.attack === 'summon') {
    const x = mob.x + ox, y = mob.y + oy
    ctx.beginPath(); ctx.arc(x, y, 145, 0, TAU); ctx.stroke()
    drawZoneMotes(ctx, x, y, 145, 0, 1 - time, color, reduced)
    ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'
    ctx.fillText('召喚', x, y - 158)
  } else {
    const x = mob.x + ox, y = mob.y + oy
    const far = ai.attack === 'dive' ? 320 : 380
    const bossShots = mob.type === 'boss' ? (mob.bossPhase === 3 ? 5 : 3) : mob.elite ? 3 : 1
    const count = ai.attack === 'dive' ? 1 : bossShots
    const angle = Math.atan2(ai.dirY, ai.dirX)
    for (let i = 0; i < count; i++) {
      const a = angle + (i - (count - 1) / 2) * (mob.type === 'boss' ? 0.18 : 0.14)
      const targetX = x + Math.cos(a) * far, targetY = y + Math.sin(a) * far
      ctx.setLineDash([])
      ctx.globalAlpha = 0.13 + (1 - time) * 0.13
      ctx.lineWidth = ai.attack === 'dive' ? mob.r * 2 + 34 : mob.type === 'boss' ? 54 : 46
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(targetX, targetY); ctx.stroke()
      ctx.setLineDash([8, 5])
      ctx.globalAlpha = 0.75
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(targetX, targetY); ctx.stroke()
    }
  }
  ctx.restore()
}

export function drawEnemyTelegraphs(ctx: Ctx2D, s: GameState, ox: number, oy: number, reduced = false): void {
  for (const enemy of s.mobs) {
    if (enemy.hp <= 0 || !enemy.ai) continue
    const ai = enemy.ai
    // ES2 encounter owns its own warnings and release textures.
    if (enemy.type === 'boss' && enemy.bossArtId) continue
    if (ai.state === 'windup') warning(ctx, enemy, ox, oy, reduced)
    else if (enemy.type !== 'boss' && (ai.releaseFx ?? 0) > 0) {
      const ground = ai.attack === 'slam'
      const size = ground ? 2 * ((enemy.elite ? BALANCE.enemies.ai.slamRadius.elite : BALANCE.enemies.ai.slamRadius.default) + BALANCE.enemies.ai.slamContactMargin) : ai.attack === 'bolt' ? 68 : enemy.r * 3.2
      drawEnemyRelease(ctx, ai.attack, (ground ? ai.aimX : enemy.x) + ox, (ground ? ai.aimY : enemy.y) + oy,
        Math.atan2(ai.dirY, ai.dirX), size, size, ai.releaseFx!, reduced, s.W, s.H)
    }
  }
}

export function drawEnemyProjectiles(ctx: Ctx2D, s: GameState, ox: number, oy: number, sprites?: Partial<ProjectileSprites>, reduced = false): void {
  for (const p of s.enemyShots) {
    const x = p.x + ox, y = p.y + oy
    const margin = Math.max(50, p.radius * 4)
    if (x < -margin || x > s.W + margin || y < -margin || y > s.H + margin) continue
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.atan2(p.vy, p.vx))
    drawEnergyMissile(ctx, sprites, 'enemy-hex', p.radius, p.life, '#c99cff', '#f2d8ff', reduced)
    ctx.restore()
  }
}

export function drawBossPhaseIndicator(ctx: Ctx2D, s: GameState): void {
  const boss = s.mobs.find(m => m.type === 'boss' && m.hp > 0)
  if (!boss) return
  const phase = boss.bossPhase ?? 1
  ctx.save()
  ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'
  ctx.fillStyle = '#130c1bd9'
  const width = Math.min(232, s.W - 24)
  ctx.fillRect(s.W / 2 - width / 2, 48, width, 32)
  ctx.fillStyle = phase === 3 ? '#ffa2a2' : '#f8deb4'
  ctx.fillText(`魔王 · 階段 ${phase}/3 ${phase === 3 ? '⚡ 狂怒' : phase === 2 ? '✦ 召喚' : '⚔ 蓄勢'}`, s.W / 2, 69)
  ctx.restore()
}
