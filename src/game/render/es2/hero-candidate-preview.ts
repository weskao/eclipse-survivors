import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from './hero-candidate-atlas'

const grid = document.querySelector<HTMLElement>('#grid')!
const pause = document.querySelector<HTMLButtonElement>('#pause')!
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let paused = still
pause.textContent = paused ? 'Play frames' : 'Pause frames'
pause.setAttribute('aria-pressed', String(paused))

const tiles = HERO_CANDIDATE_ATLASES.map(({ hero, pose, url }) => {
  const article = document.createElement('article')
  const label = document.createElement('h2')
  label.textContent = `${hero} · ${pose.toUpperCase()} · East (4 frames)`
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 336
  canvas.setAttribute('aria-label', label.textContent)
  const status = document.createElement('small')
  status.textContent = 'Loading candidate…'
  article.append(label, canvas, status)
  grid.append(article)
  const image = new Image()
  image.onload = () => { status.textContent = 'QA_PENDING · East-only · not gameplay' }
  image.onerror = () => { status.textContent = 'Source failed to load' }
  image.src = url
  return { image, canvas }
})

pause.addEventListener('click', () => {
  paused = !paused
  pause.textContent = paused ? 'Play frames' : 'Pause frames'
  pause.setAttribute('aria-pressed', String(paused))
})

let frame = 0
let prior = 0
function render(now: number): void {
  if (!paused && now - prior > 150) { frame = (frame + 1) % 4; prior = now }
  const rect = heroCandidateRect(frame)!
  for (const { image, canvas } of tiles) {
    if (!image.complete || image.naturalWidth !== 1408 || image.naturalHeight !== 1408) continue
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, canvas.width, canvas.height)
  }
  requestAnimationFrame(render)
}
requestAnimationFrame(render)
