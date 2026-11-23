/**
 * Eclipse Survivors — Dawn of the Victors.
 * Original 12-bar orchestral end-of-expedition cue: fanfare, rising theme,
 * and a final G-major resolution. Deterministic offline render, zero runtime
 * synthesis, samples, third-party packages or ongoing per-frame audio work.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SAMPLE_RATE = 24000
export const TEMPO = 112
export const BARS = 12
const BEAT = 60 / TEMPO
const DURATION = BARS * 4 * BEAT + 2.5
const TAU = Math.PI * 2
const hz = pitch => 440 * 2 ** ((pitch - 69) / 12)

// E minor moves through C and D before a true G-major victory cadence.
const HARMONY = [
  [40, 52, 55, 59, 64], [36, 48, 52, 55, 60],
  [38, 50, 54, 57, 62], [43, 55, 59, 62, 67],
  [36, 48, 52, 55, 60], [47, 50, 55, 59, 62],
  [45, 48, 52, 57, 60], [38, 50, 54, 57, 62],
  [40, 52, 55, 59, 64], [36, 48, 52, 55, 60],
  [38, 50, 54, 57, 60], [43, 55, 59, 62, 67],
]

// Each pair is [MIDI note, beats]; every bar resolves to exactly four beats.
const FANFARE = [
  [[71,.5],[74,.5],[76,1],[79,1],[83,1]],
  [[84,1],[83,.5],[81,.5],[79,1],[76,1]],
  [[78,.5],[81,.5],[86,1],[81,1],[78,1]],
  [[79,1],[83,1],[86,1],[83,1]],
  [[79,.5],[81,.5],[84,1],[83,.5],[81,.5],[79,1]],
  [[79,1],[74,.5],[76,.5],[79,1],[83,1]],
  [[81,.5],[84,.5],[88,1],[84,1],[81,1]],
  [[81,.5],[78,.5],[74,1],[78,1],[86,1]],
  [[83,1],[79,.5],[76,.5],[83,1],[86,1]],
  [[84,.5],[83,.5],[79,1],[76,1],[84,1]],
  [[86,1],[84,.5],[81,.5],[78,1],[81,1]],
  [[83,1],[86,1],[91,2]],
]

const PATCH = {
  brass: { partials: [.50,.31,.16,.07], attack: .06, release: .28, vibrato: .0019 },
  strings: { partials: [.58,.21,.13,.07,.03], attack: .18, release: .42, vibrato: .0024 },
  choir: { partials: [.65,.20,.10,.06], attack: .34, release: .58, vibrato: .0028 },
  bass: { partials: [.72,.22,.09], attack: .035, release: .20, vibrato: .0007 },
  harp: { partials: [.65,.26,.07], attack: .008, release: .28, vibrato: 0 },
  bell: { partials: [.69,.20,.08], attack: .005, release: .53, vibrato: 0 },
}

function addVoice(left, right, pitch, start, length, amount, instrument, pan = 0) {
  const patch = PATCH[instrument]
  const from = Math.max(0, Math.round(start * SAMPLE_RATE))
  const until = Math.min(left.length, Math.round((start + length) * SAMPLE_RATE))
  const frequency = hz(pitch)
  const lGain = Math.sqrt((1 - pan) / 2) * amount
  const rGain = Math.sqrt((1 + pan) / 2) * amount
  for (let i = from; i < until; i++) {
    const t = (i - from) / SAMPLE_RATE
    const release = Math.min(1, Math.max(0, (length - t) / patch.release))
    const attack = Math.min(1, t / patch.attack)
    let envelope = Math.min(attack, release)
    if (instrument === 'harp') envelope *= Math.exp(-2.8 * t)
    if (instrument === 'bell') envelope *= Math.exp(-1.7 * t)
    const phase = TAU * frequency * (t + patch.vibrato * Math.sin(TAU * 5.15 * t) / 5.15)
    let sound = 0
    for (let n = 0; n < patch.partials.length; n++) {
      sound += patch.partials[n] * Math.sin(phase * (n + 1))
    }
    if (instrument === 'strings') sound += .095 * Math.sin(phase * 1.003 + 1.4)
    if (instrument === 'choir') sound *= .94 + .06 * Math.sin(TAU * .6 * t)
    left[i] += sound * envelope * lGain
    right[i] += sound * envelope * rGain
  }
}

function percussion(left, right, start, kind, amount) {
  const length = kind === 'cymbal' ? 1.65 : kind === 'roll' ? .75 : .7
  const from = Math.round(start * SAMPLE_RATE)
  let seed = (0x146f2d31 ^ from) >>> 0
  let low = 0
  for (let j = 0; j < length * SAMPLE_RATE && from + j < left.length; j++) {
    const t = j / SAMPLE_RATE
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    const noise = (seed >>> 0) / 2147483647.5 - 1
    low = low * .93 + noise * .07
    const high = noise - low
    const env = Math.exp(-(kind === 'cymbal' ? 3.8 : 7.5) * t)
    const drum = Math.sin(TAU * (85 * t - 19 * t * t))
    const sound = kind === 'cymbal' ? high * env * .43
      : kind === 'roll' ? high * env * (.45 + .3 * Math.sin(TAU * 19 * t) ** 2)
      : (drum * .82 + noise * .18) * env
    left[from + j] += sound * amount * (kind === 'cymbal' ? .82 : 1)
    right[from + j] += sound * amount
  }
}

function addRoom(left, right) {
  // Cross-channel early reflections and diffuse room tail, offline only.
  const delay = [.079, .127, .187, .269].map(sec => Math.round(sec * SAMPLE_RATE))
  const wetL = new Float32Array(left.length)
  const wetR = new Float32Array(right.length)
  for (let i = 0; i < left.length; i++) {
    let l = left[i], r = right[i]
    for (let k = 0; k < delay.length; k++) {
      const at = i - delay[k]
      if (at < 0) continue
      const reflection = [.24,.17,.11,.08][k]
      l += reflection * (wetL[at] * .7 + wetR[at] * .3)
      r += reflection * (wetR[at] * .7 + wetL[at] * .3)
    }
    wetL[i] = l
    wetR[i] = r
  }
  return [wetL, wetR]
}

export function renderVictoryTheme() {
  const count = Math.ceil(DURATION * SAMPLE_RATE)
  const left = new Float32Array(count)
  const right = new Float32Array(count)
  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * 4 * BEAT
    const chord = HARMONY[bar]
    // String bed holds complete harmony; choir blooms in the second movement.
    for (let i = 1; i <= 4; i++) {
      addVoice(left, right, chord[i], start, 4.25 * BEAT, i < 3 ? .065 : .053,
        'strings', i % 2 ? -.54 : .54)
      if (bar >= 3) addVoice(left, right, chord[i] + 12, start + .12, 4.05 * BEAT,
        bar >= 8 ? .031 : .023, 'choir', i % 2 ? .28 : -.28)
    }
    // Grounded orchestral bass, pulsed instead of a continuous sawtooth.
    addVoice(left, right, chord[0], start, 2.0 * BEAT, .12, 'bass', -.12)
    addVoice(left, right, chord[0] + 12, start + 2 * BEAT, 1.7 * BEAT, .064, 'bass', .1)
    // Bell/harp counter-figures develop under the melody.
    for (let step = 0; step < 8; step++) {
      const pitch = chord[1 + (step % 4)] + (bar >= 8 ? 24 : 12)
      addVoice(left, right, pitch, start + step * BEAT / 2, .65 * BEAT,
        bar >= 4 ? .024 : .015, 'harp', step % 2 ? .63 : -.63)
    }
    let beat = 0
    for (const [pitch, duration] of FANFARE[bar]) {
      const grand = bar >= 8
      addVoice(left, right, pitch, start + beat * BEAT + .025,
        duration * BEAT * .95, grand ? .167 : .136, 'brass', -.08)
      if (bar >= 4) addVoice(left, right, pitch - 12, start + beat * BEAT + .065,
        duration * BEAT * .94, grand ? .066 : .046, 'strings', .42)
      beat += duration
    }
    if ([0,3,7,8,11].includes(bar)) percussion(left, right, start + .035, 'timpani', bar === 11 ? .27 : .21)
    if ([3,8,11].includes(bar)) percussion(left, right, start + .04, 'cymbal', .14)
    if ([7,10].includes(bar)) percussion(left, right, start + 3.15 * BEAT, 'roll', .085)
    if (bar === 11) {
      for (const pitch of [55,59,62,67,71,79]) {
        addVoice(left, right, pitch, start + 2 * BEAT, 2 * BEAT + 1.3,
          .068, pitch > 70 ? 'choir' : 'strings', pitch % 2 ? -.28 : .28)
      }
      addVoice(left, right, 91, start + 2 * BEAT, 2 * BEAT + 1.1, .09, 'bell', .52)
    }
  }
  const [wetL, wetR] = addRoom(left, right)
  let peak = 0, power = 0
  for (let i = 0; i < count; i++) {
    const fade = Math.min(1, Math.max(0, (DURATION - i / SAMPLE_RATE) / .5))
    wetL[i] *= fade; wetR[i] *= fade
    peak = Math.max(peak, Math.abs(wetL[i]), Math.abs(wetR[i]))
    power += (wetL[i] ** 2 + wetR[i] ** 2) / 2
  }
  const rms = Math.sqrt(power / count)
  const gain = Math.min(.86 / (peak || 1), .155 / (rms || 1))
  const wav = Buffer.allocUnsafe(44 + count * 4)
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22)
  wav.writeUInt32LE(SAMPLE_RATE, 24); wav.writeUInt32LE(SAMPLE_RATE * 4, 28)
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34)
  wav.write('data', 36); wav.writeUInt32LE(count * 4, 40)
  for (let i = 0; i < count; i++) {
    wav.writeInt16LE(Math.round(Math.max(-.99, Math.min(.99, wetL[i] * gain)) * 32767), 44 + i * 4)
    wav.writeInt16LE(Math.round(Math.max(-.99, Math.min(.99, wetR[i] * gain)) * 32767), 46 + i * 4)
  }
  return wav
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve(process.argv[2] || 'public/audio/eclipse-victory.wav')
  mkdirSync(dirname(path), { recursive: true })
  const wav = renderVictoryTheme()
  writeFileSync(path, wav)
  console.log('Created ' + path + ' (' + (wav.length / 1048576).toFixed(2) + ' MiB)')
}
