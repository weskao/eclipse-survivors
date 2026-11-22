import { describe, expect, it } from 'vitest'
import type { ToneFn } from '../music'
import { createEs2Score, ES2_SCENES } from './score'

type Note = { midi: number; at: number; duration: number; gain: number; bus: string }
const recording = () => {
  const notes: Note[] = []
  const tone: ToneFn = (midi, at, duration, gain, _wave, bus) => {
    notes.push({ midi, at, duration, gain, bus })
  }
  return { notes, tone }
}

describe('original adaptive score', () => {
  it('covers all eight moods with distinct deterministic phrases', () => {
    expect(ES2_SCENES).toEqual(['menu', 'exploration', 'combat', 'battle', 'elite', 'boss', 'victory', 'defeat'])
    const openings = ES2_SCENES.map(scene => {
      const { notes, tone } = recording()
      const score = createEs2Score()
      score.change(scene, 0)
      score.schedule(0, tone, 1)
      expect(notes.length).toBeGreaterThan(0)
      expect(notes.every(n => n.bus === 'music')).toBe(true)
      return notes.map(n => n.midi).join(',')
    })
    expect(new Set(openings).size).toBe(ES2_SCENES.length)
  })

  it('crossfades old and new themes without an abrupt gain jump', () => {
    const { notes, tone } = recording()
    const score = createEs2Score()
    score.change('exploration', 0)
    score.schedule(0, tone, 1)
    score.change('boss', 1)
    score.schedule(1, tone, 1)
    const during = notes.filter(n => n.at >= 1)
    expect(during.length).toBeGreaterThan(0)
    expect(during.every(n => n.gain > 0 && n.gain <= 0.14)).toBe(true)
    expect(during.some(n => n.gain < 0.04)).toBe(true)
    score.schedule(2.5, tone, 1)
    expect(score.currentScene).toBe('boss')
    expect(score.fadingFrom).toBe(null)
  })

  it('never schedules the same beat twice and bounds work after large clock jumps', () => {
    const { notes, tone } = recording()
    const score = createEs2Score()
    score.change('battle', 0)
    score.schedule(0, tone, 1)
    const first = notes.length
    score.schedule(0.01, tone, 1)
    expect(notes).toHaveLength(first)
    score.schedule(7000, tone, 1)
    expect(notes.length - first).toBeLessThanOrEqual(20)
    expect(notes.every(n => Number.isFinite(n.at) && Number.isFinite(n.gain))).toBe(true)
  })

  it('resets scheduling after interruption and only resumes when explicitly called', () => {
    const { notes, tone } = recording()
    const score = createEs2Score()
    score.change('menu', 0)
    score.schedule(0, tone, 1)
    score.interrupt()
    const count = notes.length
    score.schedule(20, tone, 1)
    expect(notes).toHaveLength(count)
    score.resume(20)
    score.schedule(20, tone, 1)
    expect(notes.length).toBeGreaterThan(count)
    score.dispose()
    const disposedCount = notes.length
    score.schedule(21, tone, 1)
    expect(notes).toHaveLength(disposedCount)
  })

  it('respects independent music level and produces no zero-volume notes', () => {
    const { notes, tone } = recording()
    const score = createEs2Score()
    score.change('elite', 0)
    score.schedule(0, tone, 0)
    expect(notes).toHaveLength(0)
    score.schedule(0.5, tone, 0.4)
    expect(notes.every(n => n.gain <= 0.14 * 0.4)).toBe(true)
  })
})
