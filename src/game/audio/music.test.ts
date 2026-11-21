import { describe, expect, it } from 'vitest'
import { BATTLE_TUNE, createBattleScore, createMenuScore } from './music'

interface Note { midi: number; at: number; dur: number; vol: number; wave: string; bus: string }

const recorder = () => {
  const notes: Note[] = []
  return { notes, tone: (midi: number, at: number, dur: number, vol: number, wave: string, bus: string) => { notes.push({ midi, at, dur, vol, wave, bus }) } }
}

describe('menu motif', () => {
  it('first beat plays the drone chord on the music bus then steps by .45s', () => {
    const { notes, tone } = recorder()
    const menu = createMenuScore()
    menu.setClock(0)
    menu.schedule(0, tone)
    expect(notes.map(n => [n.midi, n.dur, n.vol, n.wave, n.bus])).toEqual([
      [33, 2.55, 0.033, 'sine', 'music'],
      [52, 2.15, 0.024, 'triangle', 'music'],
      [60, 1.7, 0.015, 'sine', 'music'],
    ])
    expect(notes.map(n => n.at)).toEqual([0, 0.12, 0.27])
  })

  it('snaps a stale clock to now + .04, then steps every .45s (accent on beat 2)', () => {
    const { notes, tone } = recorder()
    const menu = createMenuScore()
    menu.setClock(0)
    menu.schedule(10, tone)
    expect(notes).toHaveLength(3)
    expect(notes[0].at).toBeCloseTo(10.04)
    menu.schedule(10, tone) // next step at 10.49, outside the .20s lookahead
    expect(notes).toHaveLength(3)
    menu.schedule(10.4, tone) // step 1 (no notes)
    menu.schedule(10.9, tone) // step 2: root 45 + [12,15,19,22][1]
    expect(notes).toHaveLength(4)
    expect(notes[3]).toMatchObject({ midi: 60, dur: 0.65, vol: 0.019, wave: 'sine', bus: 'music' })
  })

  it('resetStep restarts the chord progression', () => {
    const { notes, tone } = recorder()
    const menu = createMenuScore()
    menu.setClock(0)
    menu.schedule(0, tone)
    menu.resetStep()
    menu.setClock(1)
    menu.schedule(1, tone)
    expect(notes.slice(3).map(n => n.midi)).toEqual([33, 52, 60])
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
      [60, 0.92, 0.015, 'triangle', 'sfx'],
      [67, 1.1, 0.012, 'sine', 'sfx'],
      [72, 0.32, 0.024, 'triangle', 'sfx'],
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
