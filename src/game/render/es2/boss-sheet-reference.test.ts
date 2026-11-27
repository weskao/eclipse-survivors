import { expect, it } from 'vitest'
import { sampleBossSheetFrame } from './boss-sheet-reference'
import { drawBossAttackReference } from './boss-motion-reference'
import type { BossSnapshot, BossBodyPose } from '../../content/bosses/controller'
import type { Ctx2D } from '../ctx'

it('maps eight controller states onto seven reference rows without overlapping windup and release', () => {
  const cases = [['idle',0,0,3],['move',1,0,3],['windup',2,0,1],['attack',2,2,3],['recover',3,0,3],['hurt',4,0,3],['transform',5,0,3],['death',6,0,3]] as const
  for (const [pose,row,first,last] of cases) {
    expect(sampleBossSheetFrame(pose,0)).toEqual([first*237,row*237,237,237])
    expect(sampleBossSheetFrame(pose,1)).toEqual([last*237,row*237,237,237])
  }
  expect(sampleBossSheetFrame('move',.5)).toEqual([474,237,237,237])
  expect(sampleBossSheetFrame('idle',NaN)).toBeNull()
  expect(sampleBossSheetFrame('unknown',.5)).toBeNull()
})

it('draws real controller states from the uploaded sheet and preserves fallback', () => {
  const image = { complete: true, naturalWidth: 948, naturalHeight: 1659 } as HTMLImageElement
  const calls: unknown[][] = []
  const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
  const snapshot = (pose: BossBodyPose): BossSnapshot => ({
    id: 'infernal-titan', phase: 3, telegraphs: [], projectiles: [],
    bodyMotion: { pose, phase: 3, progress: 1, x: 0, y: 0 },
  })
  expect(drawBossAttackReference(ctx, image, snapshot('death'), 255)).toBe(true)
  expect(calls[0]?.slice(1,5)).toEqual([711,1422,237,237])
  expect(calls[0]?.[7]).toBeCloseTo(316.2)
  expect(drawBossAttackReference(ctx, image, snapshot('move'), 255, true)).toBe(false)
  expect(drawBossAttackReference(ctx, { ...image, complete: false } as HTMLImageElement, snapshot('move'), 255)).toBe(false)
  expect(calls).toHaveLength(1)
})
