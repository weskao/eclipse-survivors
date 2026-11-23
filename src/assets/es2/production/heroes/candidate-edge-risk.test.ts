import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type Frame = {
  index: number
  sourceEdgeOccupied: boolean
  sourceAlphaBBox: [number, number, number, number]
  sourceClippingRisk?: boolean
}
type Candidate = {
  originalCellPixels: number[]
  allSourceEdgesSafe: boolean
  frameQA: Frame[]
}
const source = JSON.parse(readFileSync(join(process.cwd(),
  'src/assets/es2/production/heroes/candidate-poses-2026-11-23.json'), 'utf8')) as {
  candidatePoseSources: Record<string, Candidate>
}
describe('ES2 candidate sprite boundary truthfulness', () => {
  it('flags every source-edge clipping risk even if the exported padding looks transparent', () => {
    for (const [key, candidate] of Object.entries(source.candidatePoseSources)) {
      const [width, height] = candidate.originalCellPixels
      expect(candidate.frameQA).toHaveLength(4)
      for (const f of candidate.frameQA) {
        const [left, top, right, bottom] = f.sourceAlphaBBox
        const touchesBorder = left <= 0 || top <= 0 || right >= width || bottom >= height
        expect(f.sourceClippingRisk, `${key}/frame${f.index}`)
          .toBe(f.sourceEdgeOccupied || touchesBorder)
      }
      expect(candidate.allSourceEdgesSafe, key)
        .toBe(candidate.frameQA.every(f => f.sourceClippingRisk === false))
    }
  })
})
