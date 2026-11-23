import { describe, expect, it } from 'vitest'
import { buildEnemyQaFinding } from './qa-report'
import type { AtlasFindings } from './frame-qa'

const pixels: AtlasFindings = { duplicatePairs: [], borderRiskFrames: [], blankFrames: [] }
const base = { path: 'frost-wraith-body@3x.webp', frameWidth: 228, frameHeight: 228,
  native3x: true, status: 'needs-human-approval' }
const cue = { path: 'frost-wraith-telegraph@3x.webp', frameWidth: 150, frameHeight: 150,
  native3x: true, status: 'needs-human-approval' }

describe('browser enemy QA export is truthful and never grants approval', () => {
  it('exports the actual native 3x provenance for the body and its cue', () => {
    const report = buildEnemyQaFinding('frost-wraith', 76, base, cue, pixels, pixels)
    expect(report).toMatchObject({
      kind: 'frost-wraith', source: 'frost-wraith-body@3x.webp',
      displayedPx: 76, minimumNative3xPx: 228, actualSourcePx: 228,
      bodyNative3x: true, cueNative3x: true, native3x: true,
      humanApproval: 'pending',
    })
  })

  it('does not mistake a native3x label for genuinely sufficient resolution', () => {
    expect(buildEnemyQaFinding('frost-wraith', 76,
      { ...base, frameWidth: 96, frameHeight: 96 }, cue, pixels, pixels).native3x).toBe(false)
    expect(buildEnemyQaFinding('frost-wraith', 76,
      base, { ...cue, frameWidth: 96, frameHeight: 96 }, pixels, pixels).native3x).toBe(false)
  })

  it('does not approve either source unless both have explicit approval', () => {
    expect(buildEnemyQaFinding('frost-wraith', 76,
      { ...base, status: 'approved' }, cue, pixels, pixels).humanApproval).toBe('pending')
    expect(buildEnemyQaFinding('frost-wraith', 76,
      { ...base, status: 'approved' }, { ...cue, status: 'approved' }, pixels, pixels).humanApproval).toBe('approved')
  })

  it('keeps decoded-alpha findings available for evidence', () => {
    const flags: AtlasFindings = { duplicatePairs: [[0, 1]], borderRiskFrames: [4], blankFrames: [] }
    const finding = buildEnemyQaFinding('frost-wraith', 76, base, cue, flags, pixels)
    expect(finding.bodyQa).toEqual(flags)
    expect(finding.cueQa).toEqual(pixels)
  })
})
