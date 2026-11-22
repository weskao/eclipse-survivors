import { createContentRegistry } from '../../content/registry'
import { createCombatVfxPack, emitCombatVfx } from '../../content/packs/combat-vfx'
import { createHero, createState } from '../../state'
import type { GameHooks } from '../../types'
import { COMBAT_FX_SPECS, type CombatFxKind, type FxQuality } from './combat-vfx'

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!
const ctx = canvas.getContext('2d')!
const picker = document.querySelector<HTMLSelectElement>('#effect')!
const quality = document.querySelector<HTMLSelectElement>('#quality')!
const motion = document.querySelector<HTMLInputElement>('#motion')!
const flashing = document.querySelector<HTMLInputElement>('#flashing')!
const caption = document.querySelector<HTMLElement>('#caption')!
const pauseButton = document.querySelector<HTMLButtonElement>('#pause')!
const s = createState()
s.W = canvas.width; s.H = canvas.height
s.hero = createHero('knight')
s.hero.x = s.W / 2; s.hero.y = s.H / 2
const hooks: GameHooks = { end() {}, sfx() {}, message() {}, offerUpgrades() {} }
const registry = createContentRegistry([createCombatVfxPack({
  quality: () => quality.value as FxQuality,
  reducedMotion: () => motion.checked,
  reducedFlashing: () => flashing.checked,
})])

for (const item of COMBAT_FX_SPECS) {
  const option = document.createElement('option')
  option.value = item.kind; option.textContent = item.title
  picker.append(option)
}
let paused = false
let lastFrame = 0

function replay(): void {
  s.content.effects.length = 0
  const kind = picker.value as CombatFxKind
  const spec = COMBAT_FX_SPECS.find(item => item.kind === kind)!
  // Direction is an immutable emission snapshot. It must be supplied by
  // the actual attack in production, never inferred after a hero turns.
  emitCombatVfx(effect => registry.addEffect(s, effect), kind, s.W / 2, s.H / 2,
    { angle: -Math.PI / 4 })
  caption.textContent = spec.title + ' · ' + spec.duration.toFixed(2) + ' s · ID ' + spec.id
}
function draw(): void {
  ctx.fillStyle = '#121a28'
  ctx.fillRect(0, 0, s.W, s.H)
  ctx.strokeStyle = '#2b3447'; ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 20; x <= s.W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, s.H) }
  for (let y = 10; y <= s.H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(s.W, y) }
  ctx.stroke()
  ctx.fillStyle = '#647a88'
  ctx.beginPath(); ctx.ellipse(s.W / 2, s.H / 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill()
  registry.render(ctx, s, 0, 0)
}
function frame(now: number): void {
  if (!paused && lastFrame) registry.tick(s, Math.min((now - lastFrame) / 1000, 0.05), hooks)
  lastFrame = now
  draw()
  requestAnimationFrame(frame)
}
document.querySelector<HTMLButtonElement>('#replay')!.addEventListener('click', replay)
document.querySelector<HTMLButtonElement>('#next')!.addEventListener('click', () => {
  picker.selectedIndex = (picker.selectedIndex + 1) % picker.options.length
  replay()
})
pauseButton.addEventListener('click', () => {
  paused = !paused
  pauseButton.textContent = paused ? 'Resume' : 'Pause'
})
picker.addEventListener('change', replay)
motion.addEventListener('change', replay)
flashing.addEventListener('change', replay)
quality.addEventListener('change', replay)
replay()
requestAnimationFrame(frame)
