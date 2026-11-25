import knightUrl from '../../src/assets/knight.webp'
import { createState, createHero } from '../../src/game/state.ts'
import { sampleHeroAnimation } from '../../src/game/render/animation.ts'
import { sampleWeaponRig } from '../../src/game/render/weapon-rig.ts'
import { getRigidWeaponLayers } from '../../src/game/render/rigid-weapons.ts'
import { drawRigSprite } from '../../src/game/render/characters.ts'
import { createSkin, deformBody, rigidSword } from './pose.mjs'

const W = 108, H = 134, width = 360, height = 260, footX = 180, footY = 208
const host = document.querySelector('#stage')
const status = document.querySelector('#status')
const fallback = document.createElement('canvas')
const resolution = Math.min(3, window.devicePixelRatio || 1)
fallback.width = width * resolution
fallback.height = height * resolution
const ctx = fallback.getContext('2d')
const media = matchMedia('(prefers-reduced-motion: reduce)')
let pose = 'idle', elapsed = 0, last = null, frame = 0, paused = false, reduced = false, disposed = false
let app, gpuDraw, gpuCanvas, useCanvas = false
const state = createState()
state.mode = 'play'
let hero = createHero('knight')
state.hero = hero
const image = new Image()
image.src = knightUrl
const durations = { idle: 1.33, run: .72, attack: .29, dash: .22, hurt: .35 }

function selectCanvas() {
  useCanvas = true
  host.replaceChildren(fallback)
  document.querySelector('#canvas').setAttribute('aria-pressed', 'true')
  status.textContent = 'Canvas 2D / 原版渲染'
}
function selectGpu() {
  if (!gpuDraw || !gpuCanvas) return
  useCanvas = false
  host.replaceChildren(gpuCanvas)
  document.querySelector('#canvas').setAttribute('aria-pressed', 'false')
  status.textContent = 'PixiJS 8.23.0 · WebGL · QA_PENDING'
}
function sample() {
  const phase = (elapsed % durations[pose]) / durations[pose]
  state.worldClock = elapsed
  hero.step = elapsed * Math.PI * 2 / durations.run
  hero.moveAmount = pose === 'run' ? 1 : 0
  hero.vx = hero.moveAmount * 100
  hero.strike = pose === 'attack' ? .29 * (1 - phase) : 0
  hero.dash = pose === 'dash' ? .22 * (1 - phase) : 0
  hero.inv = pose === 'hurt' ? .8 - .34 * phase : 0
  return sampleHeroAnimation(state, hero, media.matches || reduced)
}
function drawFallback(anim) {
  if (!ctx) return
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.translate(footX, footY)
  drawRigSprite(ctx, image, W, H, hero, anim, 'knight')
}
function paint() {
  const anim = sample()
  if (!useCanvas && gpuDraw) {
    try { gpuDraw(anim); return } catch (error) { console.warn(error); gpuDraw = null; selectCanvas() }
  }
  drawFallback(anim)
}
function tick(now) {
  frame = 0
  if (disposed || document.hidden || paused) return
  if (last !== null) elapsed += Math.min(.05, (now - last) / 1000)
  last = now
  paint()
  // One clock and one active renderer; a still pose requires no repeated GPU work.
  if (!(media.matches || reduced)) frame = requestAnimationFrame(tick)
}
function refresh() {
  cancelAnimationFrame(frame); frame = 0; last = null
  if (disposed || document.hidden) return
  paint()
  if (!paused && !(media.matches || reduced)) frame = requestAnimationFrame(tick)
}

async function initGpu(layers) {
  const { Application, Container, MeshPlane, Sprite, Texture } = await import('pixi.js')
  if (disposed) return
  app = new Application()
  await app.init({ width, height, resolution, autoDensity: true, backgroundAlpha: 0, preference: 'webgl', autoStart: false, sharedTicker: false })
  if (disposed) { app.destroy(true); return }
  const root = new Container()
  root.position.set(footX, footY)
  app.stage.addChild(root)
  const body = new MeshPlane({ texture: Texture.from(layers.body), verticesX: 11, verticesY: 13 })
  body.position.set(-W / 2, -H + 4)
  const { buffer } = body.geometry.getAttribute('aPosition')
  const vertices = buffer.data
  const rest = new Float32Array(vertices.length)
  for (let i = 0; i < rest.length; i += 2) {
    rest[i] = vertices[i] * W / layers.body.width
    rest[i + 1] = vertices[i + 1] * H / layers.body.height
  }
  const skin = createSkin(rest, W, H)
  const sword = new Sprite(Texture.from(layers.weapon))
  sword.anchor.set(...layers.grip)
  root.addChild(body, sword)
  gpuDraw = anim => {
    const still = sampleWeaponRig('knight', hero, { ...anim, pose: 'idle', phase: 0 })
    const rig = sampleWeaponRig('knight', hero, anim)
    const handX = rig.hand.x - still.hand.x, handY = rig.hand.y - still.hand.y
    deformBody(skin, vertices, { ...anim, step: hero.step, move: hero.moveAmount, handX, handY,
      supportX: rig.supportHand.x - still.supportHand.x, supportY: rig.supportHand.y - still.supportHand.y })
    buffer.update()
    const transform = rigidSword(layers.weapon.width, layers.weapon.height, H, layers.grip, W, handX, handY, rig.bladeAngle - still.bladeAngle)
    sword.position.set(transform.x, transform.y)
    sword.scale.set(transform.scale)
    sword.rotation = transform.rotation
    app.render()
  }
  gpuCanvas = app.canvas
  gpuCanvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    gpuDraw = null
    selectCanvas()
    document.querySelector('#canvas').disabled = true
    refresh()
  })
  selectGpu()
}

async function start() {
  try { await image.decode() } catch { status.textContent = 'Knight asset failed / 騎士素材載入失敗'; return }
  if (disposed) return
  selectCanvas()
  refresh()
  const layers = getRigidWeaponLayers(image, 'knight')
  try {
    if (!layers) throw new Error('Weapon layers unavailable')
    await initGpu(layers)
  } catch (error) {
    console.warn('PixiJS initialization failed; retaining Canvas', error)
    selectCanvas()
    document.querySelector('#canvas').disabled = true
  }
  if (disposed) return
  refresh()
}
document.querySelectorAll('[data-pose]').forEach(button => button.addEventListener('click', () => {
  pose = button.dataset.pose
  elapsed = 0
  hero = createHero('knight'); state.hero = hero
  document.querySelectorAll('[data-pose]').forEach(other => other.setAttribute('aria-pressed', String(other === button)))
  refresh()
}))
document.querySelector('#pause').addEventListener('click', event => {
  paused = !paused; event.currentTarget.setAttribute('aria-pressed', String(paused)); refresh()
})
document.querySelector('#reduce').addEventListener('click', event => {
  reduced = !reduced; event.currentTarget.setAttribute('aria-pressed', String(reduced)); refresh()
})
document.querySelector('#canvas').addEventListener('click', () => {
  if (useCanvas) selectGpu(); else selectCanvas()
  refresh()
})
media.addEventListener('change', refresh)
document.addEventListener('visibilitychange', refresh)
function dispose() {
  disposed = true; cancelAnimationFrame(frame)
  media.removeEventListener('change', refresh)
  document.removeEventListener('visibilitychange', refresh)
  if (gpuCanvas && app) app.destroy(true, { children: true, texture: true, textureSource: true })
}
window.addEventListener('pagehide', event => { if (!event.persisted) dispose() })
if (import.meta.hot) import.meta.hot.dispose(dispose)
void start()
