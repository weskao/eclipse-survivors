import { HERO_CANDIDATE_ATLASES, heroCandidateRect } from './hero-candidate-atlas'
import batch27 from '../../../assets/es2/production/heroes/shadowblade/candidates/attack-e-keyframes-2026-11-26-batch-27/manifest.json'
import batch28 from '../../../assets/es2/production/heroes/spirit-summoner/candidates/attack-e-keyframes-2026-11-26-batch-28/manifest.json'
import summonerNWReview from '../../../assets/es2/production/heroes/spirit-summoner/candidates/nw-2026-11-24-batch-6/run-nw-4frames@3x.webp'

const grid = document.querySelector<HTMLElement>('#grid')!
const eastCount = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'E').length
const southCount = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'S').length
const diagonalCount = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'SE' || asset.direction === 'SW').length
const northernCount = HERO_CANDIDATE_ATLASES.filter(asset => asset.direction === 'N' || asset.direction === 'NE' || asset.direction === 'NW').length
document.querySelector<HTMLElement>('#candidate-summary')!.textContent =
  `${HERO_CANDIDATE_ATLASES.length} local WebP candidates: ${eastCount} East-facing, ${southCount} South-facing and ${diagonalCount} diagonal four-frame strips; ${northernCount} northern four-frame strips. Two extra NW comparison panels are review-only.`

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

// Batch 6 is explicitly blocked from gameplay. Compare the authored NW with a
// reflection of the admitted NE source without adding either to the runtime registry.
type PreviewClip = {
  hero: string; pose: string; direction: string; url: string; cellPixels: 704 | 768
  reviewKind?: string; mirrored?: boolean; folder?: string; keyframe?: string
}
const previewClips: PreviewClip[] = [...HERO_CANDIDATE_ATLASES]
const summonerNE = HERO_CANDIDATE_ATLASES.find(c =>
  c.hero === 'spirit-summoner' && c.pose === 'run' && c.direction === 'NE')
previewClips.push({
  hero: 'spirit-summoner', pose: 'run', direction: 'NW', url: summonerNWReview,
  cellPixels: 768, reviewKind: 'batch-6-nw',
})
if (summonerNE) previewClips.push({
  ...summonerNE, direction: 'NW', reviewKind: 'ne-reflected-nw', mirrored: true,
})
// Uploaded candidates are displayed here only. They must not enter the
// gameplay atlas registry until the explicit manifest admission gate passes.
const pendingAtlases = [
  ['shadowblade', 'run', 'E', 'run-e-2026-11-26-batch-26'],
  ['spirit-summoner', 'run', 'E', 'run-e-2026-11-26-batch-26'],
  ['crimson-paladin', 'run', 'E', 'run-e-2026-11-26-batch-26'],
  ['shadowblade', 'run', 'E', 'run-e-2026-11-26-batch-24'],
  ['spirit-summoner', 'run', 'E', 'run-e-2026-11-26-batch-25'],
  ['spirit-summoner', 'run', 'W', 'w-2026-11-25-batch-13'],
  ['spirit-summoner', 'run', 'NW', 'nw-2026-11-25-batch-12'],
  ['crimson-paladin', 'run', 'W', 'w-2026-11-25-batch-10'],
  ['crimson-paladin', 'run', 'NW', 'nw-2026-11-25-batch-10'],
  ['crimson-paladin', 'run', 'NE', 'ne-2026-11-25-batch-11'],
  ['shadowblade', 'hurt', 'SE', 'hurt-se-2026-11-26-batch-17'],
  ['shadowblade', 'death', 'SE', 'death-se-2026-11-26-batch-18'],
  ['shadowblade', 'victory', 'SE', 'victory-se-2026-11-26-batch-19'],
  ['spirit-summoner', 'hurt', 'SE', 'hurt-se-2026-11-26-batch-17'],
  ['spirit-summoner', 'death', 'SE', 'death-se-2026-11-26-batch-19'],
  ['spirit-summoner', 'victory', 'SE', 'victory-se-2026-11-26-batch-19'],
  ['crimson-paladin', 'hurt', 'SE', 'hurt-se-2026-11-25-batch-14'],
  ['crimson-paladin', 'death', 'SE', 'death-se-2026-11-25-batch-14'],
  ['crimson-paladin', 'victory', 'SE', 'victory-se-2026-11-26-batch-19'],
  ['crimson-paladin', 'special', 'SE', 'special-se-2026-11-26-batch-20'],
  ['spirit-summoner', 'idle', 'NW', 'idle-nw-2026-11-25-batch-16'],
] as const
for (const [hero, pose, direction, folder] of pendingAtlases) {
  previewClips.push({
    hero, pose, direction, cellPixels: 768, reviewKind: 'pending-atlas', folder,
    url: import.meta.env.BASE_URL + `src/assets/es2/production/heroes/${hero}/candidates/${folder}/${pose}-${direction.toLowerCase()}-4frames@3x.webp`,
  })
}
// These are single authored poses, not a synthetic looping attack atlas.
const keyframeBatches = [
  ['attack-e-keyframes-2026-11-26-batch-27', batch27],
  ['attack-e-keyframes-2026-11-26-batch-28', batch28],
] as const
for (const [folder, manifest] of keyframeBatches) {
  for (const key of manifest.frames) {
    previewClips.push({
      hero: manifest.hero, pose: manifest.pose, direction: manifest.direction,
      cellPixels: 768, reviewKind: 'pending-keyframe', folder, keyframe: key.id,
      url: import.meta.env.BASE_URL + `src/assets/es2/production/heroes/${manifest.hero}/candidates/${folder}/${key.file}`,
    })
  }
}
grid.setAttribute('aria-label', `${previewClips.length} candidate review panels`)
document.querySelector<HTMLElement>('#candidate-summary')!.textContent +=
  ` ${pendingAtlases.length} additional pending atlases (review only). ${keyframeBatches.reduce((total, [, manifest]) => total + manifest.frames.length, 0)} independent keyframes (review only).`

const decodedSources = new Map<string, HTMLImageElement>()
const tiles = previewClips.map(({ hero, pose, direction, url, cellPixels, reviewKind, folder, keyframe, mirrored = false }) => {
  const article = document.createElement('article')
  const label = document.createElement('h2')
  const reviewLabel = reviewKind === 'batch-6-nw' ? ' · authored NW (review only)'
    : reviewKind === 'ne-reflected-nw' ? ' · reflected NE (review only)'
    : reviewKind === 'pending-keyframe' ? ' · independent pose (review only)'
    : reviewKind === 'pending-atlas' ? ' · pending atlas (review only)' : ''
  label.textContent = `${hero} · ${pose.toUpperCase()} · ${direction} (${keyframe ? '1 frame' : '4 frames'})${reviewLabel}`
  if (reviewKind) article.dataset.reviewKind = reviewKind
  if (folder) {
    article.dataset.candidateFolder = folder
    label.textContent += ` · ${folder}`
  }
  if (keyframe) {
    article.dataset.keyframe = keyframe
    label.textContent += ` · ${keyframe}`
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 336
  canvas.setAttribute('aria-label', label.textContent)
  canvas.dataset.mirrored = String(mirrored)
  const status = document.createElement('small')
  status.textContent = 'Loading candidate…'
  article.append(label, canvas, status)
  grid.append(article)
  const existing = decodedSources.get(url)
  const image = existing ?? new Image()
  const readyText = reviewKind === 'pending-atlas' || reviewKind === 'pending-keyframe'
    ? 'QA_PENDING · preview only · not admitted to gameplay'
    : reviewKind
    ? 'QA_PENDING · comparison only · verify staff handedness before gameplay'
    : `QA_PENDING · ${direction} direction only · not release art`
  image.addEventListener('load', () => {
    status.textContent = readyText
    paint()
  })
  image.addEventListener('error', () => { status.textContent = 'Source failed to load' })
  if (!existing) {
    decodedSources.set(url, image)
    image.src = url
  } else if (image.complete && image.naturalWidth > 0) {
    status.textContent = readyText
  }
  return { image, canvas, cellPixels, mirrored, keyframe }
})

function paint(): void {
  for (const { image, canvas, cellPixels, mirrored, keyframe } of tiles) {
    const sourceSize = keyframe ? cellPixels : cellPixels * 2
    if (!image.complete || image.naturalWidth !== sourceSize || image.naturalHeight !== sourceSize) continue
    const rect = keyframe ? { x: 0, y: 0, size: cellPixels } : heroCandidateRect(frame, cellPixels)!
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (mirrored) {
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(image, rect.x, rect.y, rect.size, rect.size, 0, 0, canvas.width, canvas.height)
    if (mirrored) ctx.restore()
  }
}

function updateControls(): void {
  pause.textContent = paused ? 'Play frames' : 'Pause frames'
  pause.setAttribute('aria-pressed', String(paused))
  frameStatus.textContent = `Frame ${frame + 1} / 4`
}

function schedule(): void {
  // Paused/reduced-motion QA must not redraw the candidate canvases at 60 fps.
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
