import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOSS_DEFINITIONS } from '../content/bosses/definitions'
import { BOSS_THEMES } from './boss-score'

const composer = readFileSync(resolve(process.cwd(), 'scripts/compose-boss-ost.mjs'), 'utf8')
const rules = readFileSync(resolve(process.cwd(), '.claude/rules/boss-music-production.md'), 'utf8')
const engine = readFileSync(resolve(process.cwd(), 'src/game/engine.ts'), 'utf8')

describe('mandatory music contract for every existing and future boss', () => {
  it('covers every registered boss in the original sampled score and fallback', () => {
    const ids = Object.keys(BOSS_DEFINITIONS).sort()
    expect(Object.keys(BOSS_THEMES).sort()).toEqual(ids)
    for (const id of ids) {
      expect(composer).toContain("'" + id + "': {")
      expect(BOSS_DEFINITIONS[id as keyof typeof BOSS_DEFINITIONS].introCue).toBeTruthy()
      expect(BOSS_DEFINITIONS[id as keyof typeof BOSS_DEFINITIONS].transitionCue).toBeTruthy()
      expect(BOSS_DEFINITIONS[id as keyof typeof BOSS_DEFINITIONS].deathCue).toBeTruthy()
    }
  })

  it('requires aligned phase variants, licensed audio, arrival warning and real runtime connection', () => {
    expect(composer).toContain('for(const phase of [1,2,3])')
    expect(composer).toContain("arrival-warning.mid")
    expect(engine).toContain('bossTracks: bossTrackUrls')
    expect(engine).toContain('audio.setBossWarning?.(')
    expect(engine).toContain('audio.setBossTheme?.(')
    expect(rules).toContain('SoundFont')
    expect(rules).toContain('original')
    expect(rules).toContain('QA_PENDING')
  })
})
