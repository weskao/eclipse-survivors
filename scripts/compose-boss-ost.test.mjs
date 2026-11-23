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
