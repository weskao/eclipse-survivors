import { describe, expect, it } from 'vitest'
import { BATTLE_TUNE, createBattleScore, createMenuScore } from './music'

interface Note { midi: number; at: number; dur: number; vol: number; wave: string; bus: string }

const recorder = () => {
  const notes: Note[] = []
  return { notes, tone: (midi: number, at: number, dur: number, vol: number, wave: string, bus: string) => { notes.push({ midi, at, dur, vol, wave, bus }) } }
}

describe('menu title theme', () => {
  it('opens with an audible melodic lead, rhythmic pulse, and harmony on the music bus', () => {
    const { notes, tone } = recorder()
    const menu = createMenuScore()
    menu.setClock(0)
    menu.schedule(0, tone)
    expect(notes.length).toBeGreaterThanOrEqual(5)
    expect(notes.some(n => n.midi >= 69 && n.vol >= 0.075 && n.wave === 'triangle')).toBe(true)
    expect(notes.some(n => n.wave === 'sawtooth' && n.dur <= 0.2)).toBe(true)
    expect(notes.every(n => n.bus === 'music' && n.vol > 0 && n.vol < 0.25)).toBe(true)
  })

  it('plays an eighth-note theme at a steady .3s pulse without queueing duplicates', () => {
    const { notes, tone } = recorder()
    const menu = createMenuScore()
    menu.setClock(0)
    menu.schedule(0, tone)
    const first = notes.length
    menu.schedule(0.1, tone)
    expect(notes).toHaveLength(first)
    menu.schedule(0.3, tone)
    expect(notes.length).toBeGreaterThan(first)
    expect(notes.slice(first).some(n => n.at === 0.3 && n.midi >= 69)).toBe(true)
  })

  it('changes harmonic foundation between phrases and can restart from the opening', () => {
    const { notes, tone } = recorder()
    const menu = createMenuScore()
    menu.setClock(0)
    menu.schedule(0, tone)
    const opening = notes.map(n => [n.midi, n.dur, n.vol, n.wave])
    for (let beat = 1; beat <= 8; beat++) menu.schedule(beat * 0.3, tone)
    expect(notes.some(n => Math.abs(n.at - 2.4) < 0.001 && n.midi === 53)).toBe(true)
    const before = notes.length
    menu.resetStep()
    menu.setClock(5)
    menu.schedule(5, tone)
    expect(notes.slice(before).map(n => [n.midi, n.dur, n.vol, n.wave])).toEqual(opening)
  })
})

describe('battle tune', () => {
  it('has the 32-step original melody', () => {
    expect(BATTLE_TUNE).toHaveLength(32)
    expect(BATTLE_TUNE.slice(0, 8)).toEqual([72, 76, 79, 76, 74, 72, 69, null])
  })

  it('first step: chord + melody note, advances .34s, at most 3 steps per call', () => {
    const { notes, tone } = recorder()
    const battle = createBattleScore()
    battle.setClock(0)
    battle.schedule(0, tone)
    // step 0: root 48 chord (3) + tune[0] 72; i%4===2 false
    expect(notes.slice(0, 4).map(n => [n.midi, n.dur, n.vol, n.wave, n.bus])).toEqual([
      [48, 1.15, 0.034, 'sine', 'music'],
      [60, 0.92, 0.015, 'triangle', 'music'],
      [67, 1.1, 0.012, 'sine', 'music'],
      [72, 0.32, 0.024, 'triangle', 'music'],
    ])
    // step 1 would start at .34, beyond the .17s lookahead
    expect(notes).toHaveLength(4)
  })

  it('step 2 adds the .14s hi-hat style tick at 60 + floor(i/8)*2', () => {
    const { notes, tone } = recorder()
    const battle = createBattleScore()
    battle.setClock(0)
    battle.schedule(0, tone)
    battle.schedule(0.34, tone) // step 1
    battle.schedule(0.68, tone) // step 2
    const tick = notes.find(n => n.dur === 0.14)
    expect(tick).toMatchObject({ midi: 60, vol: 0.013, wave: 'sine', bus: 'music' })
  })
})

describe('adaptive battle layers', () => {
  it('adds percussion for combat and a lower, quicker boss arrangement', () => {
    const battle = createBattleScore()
    const { notes, tone } = recorder()
    battle.setIntensity('combat')
    battle.setClock(0)
    battle.schedule(0, tone)
    expect(notes.some(n => n.midi === 36 && n.bus === 'music')).toBe(true)
    const boss = createBattleScore()
    const recording = recorder()
    boss.setIntensity('boss')
    boss.setClock(0)
    boss.schedule(0, recording.tone)
    expect(recording.notes.some(n => n.midi === 36)).toBe(true)
    expect(recording.notes.some(n => n.midi === 60 && n.dur === 0.32)).toBe(true)
  })
})
