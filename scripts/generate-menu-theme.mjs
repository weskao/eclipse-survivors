/** Eclipse Survivors — The Last Ember: an original, fully offline gothic title score.
 * No runtime synthesis and no third-party packages. Output is mono PCM for low mobile load.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SAMPLE_RATE = 24000
export const TEMPO = 72
export const BARS = 16
const BEAT = 60 / TEMPO
const LENGTH = BARS * 4 * BEAT
const TAU = Math.PI * 2
const midiHz = n => 440 * 2 ** ((n - 69) / 12)
const envelope = (t, duration, attack, release) => Math.min(1, t / attack, Math.max(0, (duration - t) / release))

// D-minor with Phrygian colour, reflecting the ruined kingdom and encroaching eclipse.
const PROGRESSION = [
  [38, 50, 53, 57, 62], [39, 51, 55, 58, 62], [34, 46, 50, 53, 57], [45, 52, 57, 60, 64],
  [38, 50, 53, 57, 62], [41, 53, 57, 60, 65], [43, 55, 58, 62, 65], [45, 52, 55, 60, 64],
  [38, 50, 53, 57, 62], [39, 51, 55, 58, 63], [43, 55, 58, 62, 67], [45, 52, 55, 60, 64],
  [34, 46, 50, 53, 58], [43, 55, 58, 62, 65], [45, 52, 57, 60, 64], [38, 50, 53, 57, 62],
]
const LAMENT = [
  [62, 65, 64, 62], [63, 62, 58, 62], [60, 58, 57, 53], [57, 60, 59, 57],
  [62, 65, 69, 65], [65, 64, 60, 57], [58, 62, 65, 62], [60, 57, 55, 57],
  [62, 65, 69, 67], [63, 67, 65, 63], [62, 58, 60, 62], [64, 60, 57, 55],
  [58, 57, 53, 50], [55, 58, 62, 58], [57, 60, 64, 60], [62, 65, 64, 62],
]

function addVoice(out, pitch, time, duration, gain, kind) {
  const start = Math.max(0, Math.round(time * SAMPLE_RATE))
  const end = Math.min(out.length, Math.round((time + duration) * SAMPLE_RATE))
  const f = midiHz(pitch)
  const attack = kind === 'choir' ? 0.75 : kind === 'strings' ? 0.52 : kind === 'horn' ? 0.28 : 0.08
  const release = kind === 'choir' ? 1.0 : kind === 'strings' ? 0.85 : 0.52
  for (let i = start; i < end; i++) {
    const t = (i - start) / SAMPLE_RATE
    const env = envelope(t, duration, attack, release)
    if (env <= 0) continue
    const vib = kind === 'bell' ? 0 : 0.0025 * Math.sin(TAU * (4.3 * t + time * 0.2))
    const phase = TAU * f * (t + vib / 4.3)
    let sample
    if (kind === 'choir') {
      sample = 0.55 * Math.sin(phase) + 0.22 * Math.sin(2 * phase) + 0.18 * Math.sin(3 * phase)
        + 0.09 * Math.sin(5 * phase) + 0.04 * Math.sin(8 * phase)
    } else if (kind === 'strings') {
      sample = 0.40 * Math.sin(phase) + 0.21 * Math.sin(2 * phase + .2) + 0.13 * Math.sin(3 * phase + .35)
        + 0.10 * Math.sin(4 * phase) + 0.06 * Math.sin(5 * phase) + 0.03 * Math.sin(7 * phase)
        + 0.14 * Math.sin(phase * 1.003 + 1.7)
    } else if (kind === 'horn') {
      sample = 0.50 * Math.sin(phase) + 0.29 * Math.sin(2 * phase + .1) + 0.14 * Math.sin(3 * phase)
        + 0.055 * Math.sin(4 * phase)
    } else {
      sample = 0.50 * Math.sin(phase) + 0.26 * Math.sin(2.02 * phase)
        + 0.16 * Math.sin(2.67 * phase) + 0.07 * Math.sin(4.2 * phase)
      sample *= Math.exp(-2.0 * t)
    }
    const breath = kind === 'choir' ? 0.94 + 0.06 * Math.sin(TAU * 0.45 * t) : 1
    out[i] += sample * gain * env * breath
  }
}

function drum(out, time, gain) {
  const start = Math.round(time * SAMPLE_RATE)
  const length = Math.round(.85 * SAMPLE_RATE)
  let seed = 1179 + start
  for (let i = 0; i < length && i + start < out.length; i++) {
    const t = i / SAMPLE_RATE
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    const noise = ((seed >>> 0) / 4294967295) * 2 - 1
    const tone = Math.sin(TAU * (64 * t - 19 * t * t))
    const env = Math.exp(-5.6 * t)
    out[start + i] += gain * env * (0.83 * tone + 0.17 * noise)
  }
}

export function renderTheme() {
  const count = Math.round(LENGTH * SAMPLE_RATE)
  const dry = new Float32Array(count)
  for (let bar = 0; bar < BARS; bar++) {
    const time = bar * 4 * BEAT
    const chord = PROGRESSION[bar]
    addVoice(dry, chord[0], time, 4 * BEAT, 0.12, 'strings')
    addVoice(dry, chord[1], time, 4 * BEAT, 0.10, 'strings')
    addVoice(dry, chord[2], time + .10, 4 * BEAT - .10, 0.085, 'choir')
    addVoice(dry, chord[3], time + .12, 4 * BEAT - .12, 0.07, 'choir')
    if (bar % 4 === 0) addVoice(dry, chord[4] + 12, time + .28, 2.1, .075, 'bell')
    if (bar % 2 === 0) drum(dry, time + 0.03, 0.18)
    const m = LAMENT[bar]
    addVoice(dry, m[0], time + .52 * BEAT, 1.3 * BEAT, .15, 'horn')
    addVoice(dry, m[1], time + 1.95 * BEAT, 1.1 * BEAT, .125, 'strings')
    if (bar % 2 === 0) addVoice(dry, m[2], time + 3.1 * BEAT, .83 * BEAT, .082, 'horn')
  }

  // Compact hall tail, rendered at build time instead of every frame.
  const room = new Float32Array(count)
  const delays = [0.097, 0.141, 0.181, 0.227].map(t => Math.round(t * SAMPLE_RATE))
  for (let i = 0; i < count; i++) {
    let wet = 0
    for (let j = 0; j < delays.length; j++) {
      const at = i - delays[j]
      if (at >= 0) wet += room[at] * [0.24, 0.19, 0.14, 0.11][j]
    }
    room[i] = dry[i] + wet
  }
  const fade = Math.round(1.3 * SAMPLE_RATE)
  for (let i = 0; i < fade; i++) {
    const a = i / (fade - 1)
    room[count - fade + i] = (1 - a) * room[count - fade + i] + a * room[i]
  }
  const edge = Math.round(.015 * SAMPLE_RATE)
  for (let i = 0; i < edge; i++) room[count - edge + i] *= 1 - i / (edge - 1)
  let sq = 0, peak = 0
  for (let i = 0; i < count; i++) { sq += room[i] ** 2; peak = Math.max(peak, Math.abs(room[i])) }
  const scale = Math.min(.88 / (peak || 1), .17 / (Math.sqrt(sq / count) || 1))
  const buf = Buffer.allocUnsafe(44 + count * 2)
  buf.write('RIFF', 0, 'ascii'); buf.writeUInt32LE(buf.length - 8, 4)
  buf.write('WAVEfmt ', 8, 'ascii'); buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SAMPLE_RATE, 24); buf.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36, 'ascii'); buf.writeUInt32LE(count * 2, 40)
  for (let i = 0; i < count; i++) buf.writeInt16LE(Math.round(Math.max(-.99, Math.min(.99, room[i] * scale)) * 32767), 44 + 2 * i)
  return buf
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] || 'public/audio/eclipse-overture.wav')
  mkdirSync(dirname(output), { recursive: true })
  const result = renderTheme()
  writeFileSync(output, result)
  console.log('Created ' + output + ' (' + (result.length / 1048576).toFixed(2) + ' MiB, ' + LENGTH.toFixed(1) + 's)')
}
