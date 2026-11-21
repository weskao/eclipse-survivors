import { TAU } from '../constants'
import type { GameState, Mob } from '../types'
import type { Ctx2D } from './ctx'

function warning(ctx: Ctx2D, mob: Mob, ox: number, oy: number): void {
  const ai = mob.ai
  if (!ai || ai.state !== 'windup') return
  const time = Math.min(1, ai.timer / (mob.type === 'boss' ? 1.3 : 1.05))
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
  } else {
    const x = mob.x + ox, y = mob.y + oy
    const far = ai.attack === 'dive' ? 320 : 380
    const targetX = x + ai.dirX * far, targetY = y + ai.dirY * far
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(targetX, targetY); ctx.stroke()
    ctx.beginPath(); ctx.arc(targetX, targetY, ai.attack === 'dive' ? 19 : 13, 0, TAU); ctx.stroke()
  }
  ctx.restore()
}

export function drawEnemyTelegraphs(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  for (const enemy of s.mobs) if (enemy.hp > 0 && enemy.ai?.state === 'windup') warning(ctx, enemy, ox, oy)
}

export function drawEnemyProjectiles(ctx: Ctx2D, s: GameState, ox: number, oy: number): void {
  for (const p of s.enemyShots) {
    const x = p.x + ox, y = p.y + oy
    if (x < -30 || x > s.W + 30 || y < -30 || y > s.H + 30) continue
    ctx.save()
    ctx.shadowColor = '#bb81ff'; ctx.shadowBlur = 19
    ctx.fillStyle = '#c99cff'
    ctx.beginPath(); ctx.arc(x, y, p.radius, 0, TAU); ctx.fill()
    ctx.strokeStyle = '#f2d8ff'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x - p.vx * 0.065, y - p.vy * 0.065); ctx.lineTo(x, y); ctx.stroke()
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
