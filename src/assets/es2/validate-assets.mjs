import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import assert from 'node:assert/strict'

function readWebp(path, maxBytes) {
  const size = statSync(path).size
  assert.ok(size > 30 && size <= maxBytes, `${path}: unexpected size ${size}`)
  const bytes = readFileSync(path)
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${path}: missing RIFF`)
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${path}: missing WEBP`)
  assert.equal(bytes.readUInt32LE(4) + 8, size, `${path}: malformed RIFF length`)
  assert.equal(bytes.toString('ascii', 12, 16), 'VP8X', `${path}: extended WebP required`)
  assert.ok(bytes[20] & 0x10, `${path}: alpha feature flag required`)
  const width = bytes.readUIntLE(24, 3) + 1
  const height = bytes.readUIntLE(27, 3) + 1
  return { width, height, sha256: createHash('sha256').update(bytes).digest('hex') }
}

export function validateConceptPack(directory) {
  const root = fileURLToPath(directory)
  const manifest = JSON.parse(readFileSync(join(root, 'concept-manifest.json'), 'utf8'))
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.status, 'concept-only', 'Unreviewed concepts must never be represented as production art')
  const atlas = manifest.atlas
  assert.equal(manifest.scale, 3)
  assert.equal(atlas.width, atlas.columns * atlas.cellWidth)
  assert.equal(atlas.height, atlas.rows * atlas.cellHeight)
  assert.equal(atlas.cellWidth, manifest.scale * manifest.designUnit)
  assert.equal(atlas.cellHeight, manifest.scale * manifest.designUnit)
  const atlasImage = readWebp(join(root, atlas.path), 256000)
  assert.equal(atlasImage.width, atlas.width)
  assert.equal(atlasImage.height, atlas.height)
  assert.equal(manifest.assets.length, atlas.rows * atlas.columns)
  const ids = new Set()
  for (const asset of manifest.assets) {
    assert.match(asset.id, /^es2-art:concept-\d{2}$/)
    assert.ok(!ids.has(asset.id), `${asset.id}: duplicate ID`)
    ids.add(asset.id)
    assert.equal(asset.role, 'concept-only')
    assert.match(asset.path, /^concept-icons\/concept-\d{2}@3x\.webp$/)
    const real = readWebp(join(root, asset.path), 96000)
    assert.equal(real.width, asset.width)
    assert.equal(real.height, asset.height)
    assert.equal(real.sha256, asset.sha256)
  }
  const canonical = Object.values(manifest.canonicalContentIds).flat()
  assert.equal(canonical.length, 24)
  assert.equal(new Set(canonical).size, 24)
  return { count: ids.size, atlasFrames: atlas.columns * atlas.rows }
}
