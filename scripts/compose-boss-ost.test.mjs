import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generateBossMidi, THEMES } from './compose-boss-ost.mjs'

describe('copyright-safe original cinematic boss OST source', () => {
  it('generates twelve phase-aligned scores plus one escalating warning', () => {
    const dir = mkdtempSync(join(tmpdir(), 'eclipse-boss-'))
    try {
      generateBossMidi(dir)
      const names = readdirSync(dir).sort()
      assert.equal(names.length, 13)
      assert.ok(names.includes('arrival-warning.mid'))
      assert.deepEqual(Object.keys(THEMES).sort(), ['abyss-monarch','eclipse-seraph','frost-sovereign','infernal-titan'])
      for (const id of Object.keys(THEMES)) {
        const phases = [1, 2, 3].map(n => readFileSync(join(dir, id + '-p' + n + '.mid')))
        for (const phase of phases) {
          assert.equal(phase.toString('ascii',0,4), 'MThd')
          assert.ok(phase.length > 4000, 'a full orchestration, not a tiny beep sequence')
        }
        assert.ok(phases[0].length < phases[1].length && phases[1].length < phases[2].length)
      }
      assert.notEqual(readFileSync(join(dir,'arrival-warning.mid')).length,0)
    } finally { rmSync(dir,{recursive:true,force:true}) }
  })
})

function trackEnds(buffer) {
  let pos = 14
  const ends = []
  const readVLQ = () => {
    let result = 0
    for (let i = 0; i < 5; i++) {
      const b = buffer[pos++]
      result = (result * 128) + (b & 127)
      if (b < 128) return result
    }
    throw new Error('invalid MIDI VLQ')
  }
  const tracks = buffer.readUInt16BE(10)
  for (let i = 0; i < tracks; i++) {
    assert.equal(buffer.toString('ascii', pos, pos + 4), 'MTrk')
    const size = buffer.readUInt32BE(pos + 4)
    pos += 8
    const limit = pos + size
    let tick = 0
    while (pos < limit) {
      tick += readVLQ()
      const status = buffer[pos++]
      if (status === 255) {
        const kind = buffer[pos++]
        const length = readVLQ()
        pos += length
        if (kind === 47) ends.push(tick)
      } else if (status >= 0xc0 && status < 0xe0) {
        pos += 1
      } else {
        assert.ok(status >= 0x80 && status < 0xf0)
        pos += 2
      }
    }
    assert.equal(pos, limit)
  }
  return ends
}
describe('MIDI end markers stay aligned across rendered phases', () => {
  it('bounds every boss track to precisely 24 bars and warning to eight bars', () => {
    const dir = mkdtempSync(join(tmpdir(), 'eclipse-score-time-'))
    try {
      generateBossMidi(dir)
      for (const id of Object.keys(THEMES)) for (const phase of [1, 2, 3]) {
        const bytes = readFileSync(join(dir, id + '-p' + phase + '.mid'))
        assert.deepEqual(new Set(trackEnds(bytes)), new Set([24 * 480 * 4]))
      }
      assert.deepEqual(new Set(trackEnds(readFileSync(join(dir,'arrival-warning.mid')))), new Set([8 * 480 * 4]))
    } finally { rmSync(dir, {recursive: true, force: true}) }
  })
})
