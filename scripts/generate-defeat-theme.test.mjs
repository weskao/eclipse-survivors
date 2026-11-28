import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDefeatTheme, SAMPLE_RATE, BARS, TEMPO } from './generate-defeat-theme.mjs'

const frames = wav => {
  const left = [], right = []
  for (let i = 44; i < wav.length; i += 4) {
    left.push(wav.readInt16LE(i) / 32768)
    right.push(wav.readInt16LE(i + 2) / 32768)
  }
  return { left, right }
}

test('defeat lament is a finite, stereo, playable WAV with a final tail', () => {
  const wav = renderDefeatTheme()
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
  const { left, right } = frames(wav)
  let sum = 0, peak = 0, difference = 0
  for (let i = 0; i < left.length; i++) {
    sum += (left[i] ** 2 + right[i] ** 2) / 2
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
    difference += Math.abs(left[i] - right[i])
  }
  assert.ok(Math.sqrt(sum / left.length) > 0.055, 'music must be audible')
  assert.ok(peak <= 0.86, 'headroom prevents clipping')
  assert.ok(difference / left.length > 0.005, 'real stereo arrangement')
  assert.ok(Math.abs(wav.readInt16LE(wav.length - 4)) < 400, 'natural silent tail')
  assert.ok(Math.abs(wav.readInt16LE(wav.length - 2)) < 400, 'natural silent tail')
})

test('most energy sits above 200 Hz, so phone and laptop speakers reproduce it', () => {
  // The old synth lament (27–196 Hz pure sines) was inaudible on small speakers.
  const { left, right } = frames(renderDefeatTheme())
  const a = Math.exp(-2 * Math.PI * 200 / SAMPLE_RATE)
  let lowL = 0, lowR = 0, total = 0, high = 0
  for (let i = 0; i < left.length; i++) {
    lowL = a * lowL + (1 - a) * left[i]
    lowR = a * lowR + (1 - a) * right[i]
    total += left[i] ** 2 + right[i] ** 2
    high += (left[i] - lowL) ** 2 + (right[i] - lowR) ** 2
  }
  assert.ok(high / total > 0.6, `high-band share ${(high / total).toFixed(3)}`)
})

test('render is deterministic, making reproducible CI and user assets', () => {
  assert.deepEqual(renderDefeatTheme(), renderDefeatTheme())
})
