import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from './hero-candidate-atlas'

const grid = document.querySelector<HTMLElement>('#grid')!
const eastCount = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'E').length
const southCount = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'S').length
document.querySelector<HTMLElement>('#candidate-summary')!.textContent =
  `${HERO_CANDIDATE_ATLASES.length} local WebP candidates: ${eastCount} East-facing and ${southCount} South-facing four-frame strips.`
grid.setAttribute('aria-label', `${HERO_CANDIDATE_ATLASES.length} candidate animation strips`)

const pause = document.querySelector<HTMLButtonElement>('#pause')!
const previous = document.querySelector<HTMLButtonElement>('#step-prev')!
const next = document.querySelector<HTMLButtonElement>('#step-next')!
const background = document.querySelector<HTMLButtonElement>('#background-toggle')!
const scale = document.querySelector<HTMLButtonElement>('#scale-toggle')!
const frameStatus = document.querySelector<HTMLOutputElement>('#frame-status')!
let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let frame = 0
let prior = 0
let scheduled = false

const tiles = HERO_CANDIDATE_ATLASES.map(({ hero, pose, direction, url, cellPixels }) => {
  const article = document.createElement('article')
  const label = document.createElement('h2')
  label.textContent = `${hero} · ${pose.toUpperCase()} · ${direction} (4 frames)`
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 336
  canvas.setAttribute('aria-label', label.textContent)
  const status = document.createElement('small')
  status.textContent = 'Loading candidate…'
  article.append(label, canvas, status)
  grid.append(article)
  const image = new Image()
  image.onload = () => {
    status.textContent = `QA_PENDING · ${direction} direction only · not gameplay`
    paint()
  }
  image.onerror = () => { status.textContent = 'Source failed to load' }
  image.src = url
  return { image, canvas, cellPixels }
})

function paint(): void {
  for (const { image, canvas, cellPixels } of tiles) {
    if (!image.complete || image.naturalWidth !== cellPixels * 2 || image.naturalHeight !== cellPixels * 2) continue
    const rect = heroCandidateRect(frame, cellPixels)!
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, canvas.width, canvas.height)
  }
}

function updateControls(): void {
  pause.textContent = paused ? 'Play frames' : 'Pause frames'
  pause.setAttribute('aria-pressed', String(paused))
  frameStatus.textContent = `Frame ${frame + 1} / 4`
}

function schedule(): void {
  // Paused/reduced-motion QA must not redraw 12 canvases at 60 fps.
  if (paused || scheduled) return
  scheduled = true
  requestAnimationFrame(render)
}

function render(now: number): void {
  scheduled = false
  if (paused) return
  if (now - prior >= 150) {
    frame = (frame + 1) % 4
    prior = now
    updateControls()
    paint()
  }
  schedule()
}

function step(delta: -1 | 1): void {
  paused = true
  frame = (frame + delta + 4) % 4
  updateControls()
  paint()
}

pause.addEventListener('click', () => {
  paused = !paused
  updateControls()
  if (paused) paint()
  else schedule()
})
previous.addEventListener('click', () => step(-1))
next.addEventListener('click', () => step(1))
background.addEventListener('click', () => {
  const light = grid.dataset.contrast !== 'light'
  grid.dataset.contrast = light ? 'light' : 'dark'
  background.setAttribute('aria-pressed', String(light))
  paint()
})
scale.addEventListener('click', () => {
  const atOneX = grid.dataset.scale !== '1x'
  grid.dataset.scale = atOneX ? '1x' : 'detail'
  scale.setAttribute('aria-pressed', String(atOneX))
  for (const { canvas } of tiles) canvas.width = canvas.height = atOneX ? 147 : 336
  paint()
})

grid.dataset.contrast = 'dark'
grid.dataset.scale = 'detail'
updateControls()
paint()
schedule()
