import test from 'node:test'
import assert from 'node:assert/strict'
import { renderTheme, SAMPLE_RATE, BARS, TEMPO } from './generate-menu-theme.mjs'

test('rendered dark-fantasy theme is a usable loopable PCM wave', () => {
  const wav = renderTheme()
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF')
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE')
  assert.equal(wav.readUInt16LE(22), 1)
  assert.equal(wav.readUInt32LE(24), SAMPLE_RATE)
  assert.equal(wav.readUInt16LE(34), 16)
  assert.equal(wav.readUInt32LE(40), wav.length - 44)
  const seconds = (wav.length - 44) / 2 / SAMPLE_RATE
  assert.ok(Math.abs(seconds - BARS * 4 * 60 / TEMPO) < 0.02)
  let sum = 0, peak = 0
  for (let i = 44; i < wav.length; i += 2) {
    const v = wav.readInt16LE(i) / 32768
    sum += v * v
    peak = Math.max(peak, Math.abs(v))
  }
  const rms = Math.sqrt(sum / ((wav.length - 44) / 2))
  assert.ok(rms > 0.075, `audible RMS needed, got ${rms}`)
  assert.ok(peak <= 0.90, `headroom required, got ${peak}`)
  assert.ok(Math.abs(wav.readInt16LE(44) - wav.readInt16LE(wav.length - 2)) < 2000, 'no loop click')
})
