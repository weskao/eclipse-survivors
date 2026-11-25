import { describe, expect, it } from 'vitest'
import { BOSS_DEFINITIONS, type BossId } from '../content/bosses/definitions'
import { createBossScore } from './boss-score'
import type { ToneFn } from './music'

const record = () => {
  const notes: Array<{ midi: number; at: number; gain: number; wave: string; bus: string }> = []
  const tone: ToneFn = (midi, at, _duration, gain, wave, bus) => {
    notes.push({ midi, at, gain, wave, bus })
  }
  return { notes, tone }
}

describe('boss-specific original score', () => {
  it('gives all four existing bosses distinct, playable opening motifs', () => {
    const openings = (Object.keys(BOSS_DEFINITIONS) as BossId[]).map(id => {
      const score = createBossScore()
      const { notes, tone } = record()
      score.select(id, 1, 0)
      score.schedule(0, tone)
      expect(notes.length).toBeGreaterThan(2)
      expect(notes.every(note => note.bus === 'music' && note.gain > 0 && note.gain <= 0.12)).toBe(true)
      return notes.map(note => note.midi + ':' + note.wave).join(',')
    })
    expect(new Set(openings).size).toBe(4)
  })

  it('adds pressure in later phases without restarting the main motif', () => {
    const score = createBossScore()
    const first = record()
    score.select('infernal-titan', 1, 0)
    score.schedule(0, first.tone)
    score.select('infernal-titan', 3, 0.01)
    const later = record()
    score.schedule(0.22, later.tone)
    expect(later.notes.length).toBeGreaterThan(first.notes.length)
    expect(later.notes.some(note => note.midi === 36)).toBe(true)
  })

  it('stops when the boss is defeated and bounds work after a frozen or delayed frame', () => {
    const score = createBossScore()
    const { notes, tone } = record()
    score.select('frost-sovereign', 1, 0)
    score.schedule(0, tone)
    const length = notes.length
    score.schedule(0, tone)
    expect(notes).toHaveLength(length)
    score.schedule(900, tone)
    expect(notes.length - length).toBeLessThanOrEqual(18)
    score.select(null, 1, 901)
    const ended = notes.length
    score.schedule(902, tone)
    expect(notes).toHaveLength(ended)
  })
})
