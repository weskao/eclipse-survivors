import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FACTION_VISUAL_SIZE } from '../../../../game/render/es2/production-factions'
import { buildEnemyQaFinding } from './qa-report'
import type { AtlasFindings } from './frame-qa'

const pixels: AtlasFindings = { duplicatePairs: [], borderRiskFrames: [], blankFrames: [] }
const base = { path: 'frost-wraith-body@3x.webp', frameWidth: 228, frameHeight: 228,
  native3x: true, status: 'needs-human-approval' }
const cue = { path: 'frost-wraith-telegraph@3x.webp', frameWidth: 150, frameHeight: 150,
  native3x: true, status: 'needs-human-approval' }

describe('browser enemy QA export is truthful and never grants approval', () => {
  it('reads 1x gameplay dimensions from the same visual-size contract as the live renderer', () => {
    const source = readFileSync(fileURLToPath(new URL('./qa-preview.ts', import.meta.url)), 'utf8')
    expect(source).toContain('FACTION_VISUAL_SIZE[kind]')
    expect(source).not.toContain('ENEMY_DEFINITIONS[kind].radius * 4')
    expect(FACTION_VISUAL_SIZE['shadow-assassin']).toBe(146)
    const finding = buildEnemyQaFinding('shadow-assassin', FACTION_VISUAL_SIZE['shadow-assassin'],
      { ...base, frameWidth: 216, frameHeight: 216 }, cue, pixels, pixels)
    expect(finding.minimumNative3xPx).toBe(438)
    expect(finding.bodyNative3x).toBe(false)
  })


  it('exports the actual native 3x provenance for the body and its cue', () => {
    const report = buildEnemyQaFinding('frost-wraith', FACTION_VISUAL_SIZE['frost-wraith'], base, cue, pixels, pixels)
    expect(report).toMatchObject({
      kind: 'frost-wraith', source: 'frost-wraith-body@3x.webp',
      displayedPx: FACTION_VISUAL_SIZE['frost-wraith'], minimumNative3xPx: 498, actualSourcePx: 228,
      bodyNative3x: false, cueNative3x: true, native3x: false,
      humanApproval: 'pending',
    })
  })

  it('does not mistake a native3x label for genuinely sufficient resolution', () => {
    expect(buildEnemyQaFinding('frost-wraith', FACTION_VISUAL_SIZE['frost-wraith'],
      { ...base, frameWidth: 96, frameHeight: 96 }, cue, pixels, pixels).native3x).toBe(false)
    expect(buildEnemyQaFinding('frost-wraith', FACTION_VISUAL_SIZE['frost-wraith'],
      base, { ...cue, frameWidth: 96, frameHeight: 96 }, pixels, pixels).native3x).toBe(false)
  })

  it('does not approve either source unless both have explicit approval', () => {
    expect(buildEnemyQaFinding('frost-wraith', FACTION_VISUAL_SIZE['frost-wraith'],
      { ...base, status: 'approved' }, cue, pixels, pixels).humanApproval).toBe('pending')
    expect(buildEnemyQaFinding('frost-wraith', FACTION_VISUAL_SIZE['frost-wraith'],
      { ...base, status: 'approved' }, { ...cue, status: 'approved' }, pixels, pixels).humanApproval).toBe('approved')
  })

  it('keeps decoded-alpha findings available for evidence', () => {
    const flags: AtlasFindings = { duplicatePairs: [[0, 1]], borderRiskFrames: [4], blankFrames: [] }
    const finding = buildEnemyQaFinding('frost-wraith', FACTION_VISUAL_SIZE['frost-wraith'], base, cue, flags, pixels)
    expect(finding.bodyQa).toEqual(flags)
    expect(finding.cueQa).toEqual(pixels)
  })
})
