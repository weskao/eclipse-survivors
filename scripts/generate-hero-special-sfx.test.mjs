import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HERO_SFX_DURATION, renderHeroSfx } from './generate-hero-special-sfx.mjs'

test('all three cinematic hero samples are distinct stereo PCM with bounded peaks and clean tails', () => {
  const rendered = []
  for (const [cue, seconds] of Object.entries(HERO_SFX_DURATION)) {
    const file = readFileSync(new URL('../public/audio/heroes/' + cue + '.wav', import.meta.url))
    assert.equal(file.toString('ascii', 0, 4), 'RIFF')
    assert.equal(file.toString('ascii', 8, 12), 'WAVE')
    assert.equal(file.readUInt16LE(20), 1)
    assert.equal(file.readUInt16LE(22), 2)
    assert.equal(file.readUInt32LE(24), 32000)
    assert.equal(file.readUInt16LE(34), 16)
    assert.equal(file.length, 44 + Math.round(seconds * 32000) * 4)
    const reference = renderHeroSfx(cue, seconds)
    const view = new DataView(reference.bytes.buffer)
    let peak = 0, sum = 0, side = 0, delta = 0
    for (let i = 44; i < file.length; i += 4) {
      const l = file.readInt16LE(i), r = file.readInt16LE(i + 2)
      peak = Math.max(peak, Math.abs(l), Math.abs(r))
      sum += l*l + r*r
      side += (l-r)**2
      delta = Math.max(delta, Math.abs(l - view.getInt16(i, true)), Math.abs(r - view.getInt16(i+2, true)))
    }
    const samples = (file.length - 44) / 2
    assert.ok(peak / 32767 >= .8 && peak / 32767 <= .85)
    assert.ok(Math.sqrt(sum / samples) / 32767 > .15)
    assert.ok(side > sum * .01)
    assert.ok(delta <= 2, 'checked-in sample must match its original generator')
    assert.equal(file.readInt16LE(file.length - 2), 0)
    assert.equal(file.readInt16LE(file.length - 4), 0)
    rendered.push(file)
  }
  assert.equal(rendered.length, 3)
  assert.ok(!rendered[0].equals(rendered[1]) && !rendered[1].equals(rendered[2]))
})
