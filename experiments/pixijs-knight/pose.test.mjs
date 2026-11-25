import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSkin, deformBody, rigidSword } from './pose.mjs'
const rest = new Float32Array([0,0,22,50,50,100,100,100])
const skin = createSkin(rest, 100, 100)
const neutral = { pose: 'idle', phase: 0, reducedMotion: false, step: 0, move: 0, handX: 0, handY: 0, supportX: 0, supportY: 0 }
const attack = { ...neutral, pose: 'attack', phase: .5, handX: 12, handY: -8, supportX: -4, supportY: -3 }
test('reduced motion restores exact source vertices', () => {
  const output = new Float32Array(rest.length)
  deformBody(skin, output, { ...attack, reducedMotion: true })
  assert.deepEqual(output, rest)
})
test('main hand follows sampled bones without shifting feet in attack', () => {
  const output = new Float32Array(rest.length)
  deformBody(skin, output, attack)
  assert.deepEqual([...output.slice(2,4)], [34,42])
  assert.deepEqual(output.slice(4), rest.slice(4))
})
test('run motion is deterministic and never accumulates deformation', () => {
  const output = new Float32Array(rest.length)
  const run = { ...neutral, pose: 'run', step: Math.PI / 2, move: 1 }
  deformBody(skin, output, run)
  const expected = output.slice()
  assert.notDeepEqual(expected, rest)
  deformBody(skin, output, attack)
  deformBody(skin, output, run)
  assert.deepEqual(output, expected)
})
test('weapon uses uniform scale, fixed grip and a rigid rotation', () => {
  assert.deepEqual(rigidSword(300, 600, 134, [.22,.5], 108, 12, -8, .4), { scale: 134/600, x: 108*(.22-.5)+12, y: 134*(.5-1)+4-8, rotation: .4 })
})
