/** Browser-only inspection view; does not change production rendering or gameplay. */
import { ENEMY_DEFINITIONS } from '../../../../game/content/enemies/definitions'
import { FACTION_VISUAL_SIZE } from '../../../../game/render/es2/production-factions'
import assassinMasterUrl from './masters/shadow-assassin-6-poses-3x2-master-1536x1024.webp?url'
import manifest from './manifest.json'
import crystalSentinelCandidate from './candidates/crystal-sentinel-native3x-QA.json'
import { inspectAtlasPixels } from './frame-qa'
import { buildEnemyQaFinding } from './qa-report'

const urls = import.meta.glob('./*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const candidateUrls = import.meta.glob('./candidates/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const findings: unknown[] = []
const root = document.querySelector<HTMLElement>('#candidates')!
const summary = document.querySelector<HTMLElement>('#summary')!

function load(path: string, previewOnly = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = (previewOnly ? candidateUrls : urls)[(previewOnly ? './candidates/' : './') + path]
    if (!url) return reject(new Error('Missing Vite asset: ' + path))
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Cannot decode ' + path))
    image.src = url
  })
}

function frameCanvas(image: HTMLImageElement, index: number, source: number, display: number, columns = 6): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = display
  canvas.height = display
  canvas.title = 'Frame ' + (index + 1) + ': ' + display + 'x' + display + ' rendered pixels'
  canvas.getContext('2d')!.drawImage(image, (index % columns) * source,
    Math.floor(index / columns) * source, source, source, 0, 0, display, display)
  return canvas
}

function checkPixels(image: HTMLImageElement, frameSide: number, frameCount: number) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0)
  return inspectAtlasPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    canvas.width, canvas.height, frameSide, frameCount)
}

async function inspectCandidate(body: (typeof manifest.assets)[number]): Promise<void> {
  const kind = body.id as keyof typeof ENEMY_DEFINITIONS
  const cue = manifest.assets.find(asset => asset.id === kind + ':telegraph')
  if (!cue) throw new Error('Missing warning for ' + kind)
  const section = document.createElement('section')
  section.className = 'candidate'
  const heading = document.createElement('h2')
  heading.textContent = ENEMY_DEFINITIONS[kind].title + ' · ' + kind
  section.append(heading)
  root.append(section)

  try {
    const [sprite, warning] = await Promise.all([load(body.path), load(cue.path)])
    if (sprite.naturalWidth !== body.width || sprite.naturalHeight !== body.height ||
        warning.naturalWidth !== cue.width || warning.naturalHeight !== cue.height) {
      throw new Error('Actual decoded image dimensions differ from the manifest')
    }
    const display = FACTION_VISUAL_SIZE[kind]
    // The actual Assassin combat renderer uses the already committed full 512px
    // authoring master; the 216px strip is only its decode fallback.
    let sourceImage = sprite
    let sourceWidth = body.frameWidth
    let sourceColumns = body.columns
    let sourcePath = body.path
    if (kind === 'shadow-assassin') {
      const master = new Image()
      master.src = assassinMasterUrl
      await master.decode()
      if (master.naturalWidth !== 1536 || master.naturalHeight !== 1024) {
        throw new Error('Assassin gameplay master geometry is not 3×2 × 512px')
      }
      sourceImage = master
      sourceWidth = 512
      sourceColumns = 3
      sourcePath = 'masters/shadow-assassin-6-poses-3x2-master-1536x1024.webp'
    }
    const info = document.createElement('p')
    info.textContent = 'Actual combat size: ' + display + 'px · displayed frame source: ' + sourceWidth +
      'px · 3× minimum: ' + (display * 3) + 'px · warning source: ' + cue.frameWidth + 'px'
    section.append(info)

    const frames = document.createElement('div')
    frames.className = 'frames'
    for (let i = 0; i < body.frames; i++) {
      const figure = document.createElement('figure')
      figure.append(frameCanvas(sourceImage, i, sourceWidth, display, sourceColumns))
      const caption = document.createElement('figcaption')
      caption.textContent = ['Ready A', 'Ready B', 'Windup', 'Attack', 'Recover', 'Phase'][i] ?? ('Frame ' + i)
      figure.append(caption)
      frames.append(figure)
    }
    const figure = document.createElement('figure')
    figure.append(frameCanvas(warning, 0, cue.frameWidth, 40))
    const caption = document.createElement('figcaption')
    caption.textContent = 'Warning · 40px'
    figure.append(caption)
    frames.append(figure)
    section.append(frames)

    // Opt-in browser-only compare: candidate does NOT replace the gameplay sprite.
    if (kind === 'crystal-sentinel') {
      const proposal = crystalSentinelCandidate
      const candidateImage = await load(proposal.runtime.file, true)
      if (candidateImage.naturalWidth !== proposal.runtime.width ||
          candidateImage.naturalHeight !== proposal.runtime.height) {
        throw new Error('Crystal Sentinel QA candidate atlas dimensions do not match source record')
      }
      const heading = document.createElement('p')
      heading.textContent = 'QA CANDIDATE ONLY — compare heavier armored silhouette with canonical enemy; not active in gameplay'
      section.append(heading)
      const candidateFrames = document.createElement('div')
      candidateFrames.className = 'frames'
      for (let i = 0; i < proposal.runtime.frames; i++) {
        const figure = document.createElement('figure')
        figure.append(frameCanvas(candidateImage, i, proposal.runtime.frameWidth, display))
        const caption = document.createElement('figcaption')
        caption.textContent = 'QA candidate · ' + proposal.poseNames[i]
        figure.append(caption)
        candidateFrames.append(figure)
      }
      section.append(candidateFrames)
      const candidateQa = checkPixels(candidateImage, proposal.runtime.frameWidth, proposal.runtime.frames)
      const review = document.createElement('p')
      review.className = 'warnings'
      review.textContent = 'QA only: ' + proposal.status + '; alpha-border risk ' +
        (candidateQa.borderRiskFrames.join(', ') || 'none') +
        '; identity approval pending; real gameplay review still required.'
      section.append(review)
    }

    const bodyQa = checkPixels(sprite, body.frameWidth, body.frames)
    const cueQa = checkPixels(warning, cue.frameWidth, cue.frames)
    const status = document.createElement('p')
    status.className = 'warnings'
    status.textContent = 'Body: blank ' + (bodyQa.blankFrames.join(', ') || 'none') +
      '; identical neighboring poses ' + (bodyQa.duplicatePairs.map(pair => pair.join('→')).join(', ') || 'none') +
      '; edge-contact frames ' + (bodyQa.borderRiskFrames.join(', ') || 'none') +
      '. Warning: edge-contact ' + (cueQa.borderRiskFrames.join(', ') || 'none') + '. Human review required.'
    section.append(status)
    const sampledBody = { ...body, path: sourcePath, frameWidth: sourceWidth, frameHeight: sourceWidth }
    const finding = buildEnemyQaFinding(kind, display, sampledBody, cue, bodyQa, cueQa)
    if (!finding.bodyNative3x) {
      const notice = document.createElement('p')
      notice.className = 'warnings'
      notice.textContent = 'Active frame source is below 3× gameplay detail. Existing genuine master and authored runtime art need remediation; human approval remains pending.'
      section.append(notice)
    }
    findings.push(finding)
  } catch (error) {
    const failure = document.createElement('p')
    failure.className = 'error'
    failure.textContent = error instanceof Error ? error.message : String(error)
    section.append(failure)
    findings.push({ kind, error: failure.textContent })
  }
}

void (async () => {
  const bodies = manifest.assets.filter(entry => !entry.id.includes(':'))
  for (const body of bodies) await inspectCandidate(body)
  summary.textContent = 'Decoded ' + findings.length + ' / ' + bodies.length +
    ' enemy types. This is an asset-only preview, NOT real gameplay evidence or human approval.'
})()

document.querySelector<HTMLButtonElement>('#export')!.addEventListener('click', () => {
  const json = JSON.stringify({ manifestStatus: manifest.status, inspectedAt: new Date().toISOString(), findings }, null, 2)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = 'es2-enemies-qa-browser-findings.json'
  a.click()
  URL.revokeObjectURL(a.href)
})
