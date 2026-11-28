/**
 * Eclipse Survivors — Ashes of the Fallen.
 * Original 8-bar D-minor lament for a lost expedition: a mid-register string
 * elegy over a sparse funeral toll, so phone and laptop speakers reproduce it.
 * Deterministic offline render sharing the victory anthem's instruments,
 * room and mastering; zero runtime synthesis, samples or third-party audio.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SAMPLE_RATE, addVoice, percussion, masterWav } from './generate-victory-theme.mjs'

export { SAMPLE_RATE }
export const TEMPO = 72
export const BARS = 8
const BEAT = 60 / TEMPO
const DURATION = BARS * 4 * BEAT + 2.5

// Bass, then four upper voices: Dm · B♭ · Gm · A · Dm/F · Gm · Asus–A · Dm.
const HARMONY = [
  [38, 57, 62, 65, 69], [46, 58, 62, 65, 70],
  [43, 58, 62, 67, 70], [45, 57, 61, 64, 69],
  [41, 57, 62, 65, 69], [43, 58, 62, 67, 70],
  [45, 57, 62, 64, 69], [38, 57, 62, 65, 69],
]

// Each pair is [MIDI note, beats]; every bar resolves to exactly four beats.
const ELEGY = [
  [[69,1.5],[67,.5],[65,1],[64,1]],
  [[62,2],[65,1],[70,1]],
  [[69,1.5],[67,.5],[70,1],[67,1]],
  [[64,2],[61,1],[64,1]],
  [[65,1.5],[64,.5],[62,1],[69,1]],
  [[70,1.5],[69,.5],[67,1],[65,1]],
  [[64,1],[62,1],[61,1],[64,1]],
  [[62,4]],
]

export function renderDefeatTheme() {
  const count = Math.ceil(DURATION * SAMPLE_RATE)
  const left = new Float32Array(count)
  const right = new Float32Array(count)
  for (let bar = 0; bar < BARS; bar++) {
    const start = bar * 4 * BEAT
    const chord = HARMONY[bar]
    // Sustained string bed; a distant choir joins for the second phrase.
    for (let i = 1; i <= 4; i++) {
      addVoice(left, right, chord[i], start, 4.2 * BEAT, i < 3 ? .05 : .042,
        'strings', i % 2 ? -.5 : .5)
      if (bar >= 4) addVoice(left, right, chord[i] + 12, start + .2, 3.9 * BEAT,
        .018, 'choir', i % 2 ? .3 : -.3)
    }
    // A soft, short bass pulse only; low energy would vanish on small speakers.
    addVoice(left, right, chord[0] + 12, start, 1.8 * BEAT, .045, 'bass', -.1)
    let beat = 0
    for (const [pitch, duration] of ELEGY[bar]) {
      addVoice(left, right, pitch + 12, start + beat * BEAT + .03,
        duration * BEAT * .97, bar >= 4 ? .15 : .13, 'strings', -.12)
      if (bar >= 4) addVoice(left, right, pitch, start + beat * BEAT + .07,
        duration * BEAT * .95, .055, 'strings', .38)
      beat += duration
    }
    // Funeral bell tolls on the phrase openings and the final cadence.
    if ([0, 4, 7].includes(bar)) addVoice(left, right, 74, start, 2.6, .07, 'bell', .45)
    if ([3, 7].includes(bar)) {
      for (let step = 0; step < 4; step++) {
        addVoice(left, right, chord[4 - step] + 12, start + (2 + step * .5) * BEAT,
          .9 * BEAT, .02, 'harp', step % 2 ? .6 : -.6)
      }
    }
    if (bar === 6) percussion(left, right, start + 3 * BEAT, 'roll', .06)
    if (bar === 7) {
      percussion(left, right, start + .03, 'timpani', .16)
      addVoice(left, right, 81, start + 1.5 * BEAT, 2.5 * BEAT + 1.4, .03, 'choir', .2)
    }
  }
  return masterWav(left, right, DURATION)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = resolve(process.argv[2] || 'public/audio/eclipse-defeat.wav')
  mkdirSync(dirname(path), { recursive: true })
  const wav = renderDefeatTheme()
  writeFileSync(path, wav)
  console.log('Created ' + path + ' (' + (wav.length / 1048576).toFixed(2) + ' MiB)')
}
