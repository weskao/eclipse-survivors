// Hero locomotion (original update() lines 124-154).
import { pushEcho } from './fx'
import { dist, rand, random } from './math'
import type { GameState, MoveInput } from './types'

export function moveHero(s: GameState, input: MoveInput, dt: number, speedMultiplier = 1): void {
  const hero = s.hero
  if (!hero) return
  const { x, y } = input
  const amount = dist(x, y)
  const moving = amount > 0.05
  // Accelerate/decelerate smoothly, preserve diagonal speed and direction.
  // Drag is strong enough to avoid ice-skating when input is released.
  const speed = hero.speed * (hero.dash > 0 ? 2.8 : 1) * Math.max(0, Math.min(1, speedMultiplier))
  const targetX = moving ? (x / Math.max(1, amount)) * speed : 0
  const targetY = moving ? (y / Math.max(1, amount)) * speed : 0
  const smooth = 1 - Math.exp(-dt * (moving ? 19 : 24))
  hero.vx += (targetX - hero.vx) * smooth
  hero.vy += (targetY - hero.vy) * smooth
  if (!moving && Math.abs(hero.vx) < 0.4) hero.vx = 0
  if (!moving && Math.abs(hero.vy) < 0.4) hero.vy = 0
  const dx = hero.vx * dt
  const dy = hero.vy * dt
  const travel = dist(dx, dy)
  hero.x += dx
  hero.y += dy
  const gait = Math.min(1, dist(hero.vx, hero.vy) / Math.max(1, hero.speed))
  hero.moveAmount += (gait - hero.moveAmount) * (1 - Math.exp(-dt * 14))
  if (travel > 0.0001) {
    hero.step += travel / 18
    hero.footDistance += travel
    // Grounded footsteps instead of swinging disconnected legs or giant bounces.
    if (hero.footDistance >= 48 && hero.dash <= 0) {
      hero.footDistance %= 48
      if (s.fx.length < 230 && s.currentScene !== 1) {
        const side = Math.sin(hero.step) > 0 ? 1 : -1
        for (let i = 0; i < 3; i++) {
          s.fx.push({
            x: hero.x + side * 7 + rand(-5, 5), y: hero.y + rand(-3, 2), vx: rand(-12, 12), vy: rand(-10, -2),
            life: 0.3, max: 0.3, color: s.currentScene === 2 ? '#ecf5ff' : '#c7ac88', r: 1.6 + rand(0, 1.1), type: 'footstep',
          })
        }
      }
    }
    if (hero.strike <= 0 && moving && Math.abs(hero.vx) > 10) hero.face = hero.vx > 0 ? 1 : -1
    if (hero.dash > 0 && random() < dt * 18) pushEcho(s, hero.x, hero.y, s.choice, s.worldClock)
  }
}
