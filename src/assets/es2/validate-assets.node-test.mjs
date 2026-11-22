import test from 'node:test'
import assert from 'node:assert/strict'
import { validateConceptPack } from './validate-assets.mjs'

test('ES2 concept art manifest paths, WebP bytes, 3x atlas geometry and hashes are valid', () => {
  const result = validateConceptPack(new URL('.', import.meta.url))
  assert.equal(result.count, 24)
  assert.equal(result.atlasFrames, 24)
})
