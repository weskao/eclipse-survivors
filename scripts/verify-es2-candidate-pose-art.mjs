import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.argv[2] || '.')
const folder = 'src/assets/es2/production/heroes'
const manifest = JSON.parse(readFileSync(resolve(root, folder, 'candidate-poses-2026-11-23.json'), 'utf8'))
const entries = Object.entries(manifest.candidatePoseSources)
if (entries.length !== 9 || manifest.status !== 'QA_PENDING') throw new Error('Expected 9 QA_PENDING hero action candidates')
const heroes = new Set(['shadowblade', 'spirit-summoner', 'crimson-paladin'])
const poses = new Set(['run', 'attack', 'special'])
for (const [key, entry] of entries) {
  const [hero, pose] = key.split(':')
  if (!heroes.has(hero) || !poses.has(pose) || entry.hero !== hero || entry.pose !== pose) throw new Error(`Invalid hero/pose: ${key}`)
  if (entry.direction !== 'E' || entry.frames !== 4 || entry.QA !== 'QA_PENDING' || entry.runtimeApplied !== false || entry.native3x !== 'unverified') throw new Error(`Incorrect candidate approval or direction: ${key}`)
  const [cellWidth, cellHeight] = entry.originalCellPixels
  if (entry.frameQA.length !== 4 || entry.frameQA.some(f => {
    if (!Array.isArray(f.sourceAlphaBBox) || f.sourceAlphaBBox.length !== 4) return true
    const [left, top, right, bottom] = f.sourceAlphaBBox
    const risk = f.sourceEdgeOccupied || left <= 0 || top <= 0 ||
      right >= cellWidth || bottom >= cellHeight
    return f.sourceClippingRisk !== risk
  }) || entry.allSourceEdgesSafe !== entry.frameQA.every(f => !f.sourceClippingRisk) ||
    entry.sourceClippingRiskFrames?.join(',') !== entry.frameQA
      .filter(f => f.sourceClippingRisk).map(f => f.index).join(','))
    throw new Error(`Source cropping review is inaccurate: ${key}`)
  const path = resolve(root, entry.file)
  if (!path.startsWith(resolve(root, folder) + '/')) throw new Error(`Unsafe path: ${key}`)
  const buf = readFileSync(path)
  if (buf.length !== entry.bytes || createHash('sha256').update(buf).digest('hex') !== entry.webpSHA256) throw new Error(`Invalid source SHA-256: ${key}`)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP' || buf.readUInt32LE(4) + 8 !== buf.length) throw new Error(`Invalid WebP RIFF: ${key}`)
  if (buf.toString('ascii', 12, 16) !== 'VP8X' || 1 + buf.readUIntLE(24, 3) !== 1408 || 1 + buf.readUIntLE(27, 3) !== 1408) throw new Error(`Invalid WebP atlas dimensions: ${key}`)
}
console.log(`Validated ${entries.length} East-facing 4-frame candidate atlases (QA_PENDING; production renderers unchanged)`)
