import test from 'node:test'
import assert from 'node:assert/strict'
import { renderVictoryTheme, SAMPLE_RATE, BARS, TEMPO } from './generate-victory-theme.mjs'

test('victory anthem is a finite, stereo, playable orchestral WAV with a final tail', () => {
  const wav = renderVictoryTheme()
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF')
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE')
  assert.equal(wav.readUInt16LE(20), 1)
  assert.equal(wav.readUInt16LE(22), 2)
  assert.equal(wav.readUInt32LE(24), SAMPLE_RATE)
  assert.equal(wav.readUInt16LE(34), 16)
  assert.equal(wav.readUInt32LE(40), wav.length - 44)
  const duration = (wav.length - 44) / (SAMPLE_RATE * 4)
  assert.ok(duration > BARS * 4 * 60 / TEMPO + 2)
  assert.ok(duration < 32)
  let sum = 0, peak = 0, difference = 0
  const frames = (wav.length - 44) / 4
  for (let i = 44; i < wav.length; i += 4) {
    const left = wav.readInt16LE(i) / 32768
    const right = wav.readInt16LE(i + 2) / 32768
    sum += (left * left + right * right) / 2
    peak = Math.max(peak, Math.abs(left), Math.abs(right))
    difference += Math.abs(left - right)
  }
  assert.ok(Math.sqrt(sum / frames) > 0.055, 'music must be audible')
  assert.ok(peak < 0.92, 'headroom prevents clipping')
  assert.ok(difference / frames > 0.005, 'real stereo arrangement')
  assert.ok(Math.abs(wav.readInt16LE(wav.length - 4)) < 400, 'natural silent tail')
  assert.ok(Math.abs(wav.readInt16LE(wav.length - 2)) < 400, 'natural silent tail')
})

test('render is deterministic, making reproducible CI and user assets', () => {
  const first = renderVictoryTheme()
  const second = renderVictoryTheme()
  assert.deepEqual(first, second)
})
