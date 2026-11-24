import { describe, expect, it, vi } from 'vitest'
import { BOSS_NATIVE_KEYFRAMES, selectBossNativeKeyframe, drawBossNativeKeyframe, registerBossNativeKeyframe } from './boss-native-keyframes'
import { loadWorldRuntimeImages, WORLD_ART } from './production-world'
import type { BossSnapshot, BossBodyPose } from '../../content/bosses/controller'
import type { BossId } from '../../content/bosses/definitions'
import type { Ctx2D } from '../ctx'

const cue = { attackId: 'titan-slam', shape: 'circle' as const, x: 0, y: 0, radius: 50, innerRadius: 0, width: 0, length: 0, angle: 0, safeAngle: 0, damage: 0, color: '#fff', harmless: true }
const snapshot = (pose: BossBodyPose, attackId = 'titan-slam', id: BossId = 'infernal-titan'): BossSnapshot => ({
  id, phase: 3, bodyMotion: { pose, phase: 3, progress: .25, x: 0, y: 0 }, projectiles: [],
  telegraphs: [{ ...cue, attackId, stage: 'warning', progress: .5 }],
  impacts: [{ ...cue, attackId, life: .8, max: 1 }],
})
describe('DEV Infernal Titan isolated native keyframe review', () => {
  it('maps only eligible encounter poses and actual slam attack, never unrelated attacks', () => {
    for (const [pose, key] of Object.entries({ idle: 'idle', move: 'move', windup: 'windup', attack: 'slam', hurt: 'hurt', transform: 'transform', death: 'death' })) {
      expect(selectBossNativeKeyframe(snapshot(pose as BossBodyPose))).toBe(key)
    }
    expect(selectBossNativeKeyframe(snapshot('attack', 'eruption'))).toBeNull()
    expect(selectBossNativeKeyframe(snapshot('windup', 'ember-line'))).toBeNull()
    expect(selectBossNativeKeyframe(snapshot('recover'))).toBe('recover')
    expect(selectBossNativeKeyframe(snapshot('recover', 'eruption'))).toBeNull()
    expect(selectBossNativeKeyframe(snapshot('death', 'titan-slam', 'abyss-monarch'))).toBeNull()
    expect(selectBossNativeKeyframe({ ...snapshot('death'), bodyMotion: undefined })).toBeNull()
  })
  it('samples staged death and actual slam candidates at the real encounter progress boundaries', () => {
    const at = (pose: BossBodyPose, progress: number, attackId = 'titan-slam'): BossSnapshot => {
      const state = snapshot(pose, attackId)
      return { ...state, bodyMotion: { ...state.bodyMotion!, progress } }
    }
    expect([0, 1 / 3, 2 / 3, 1].map(p => selectBossNativeKeyframe(at('death', p))))
      .toEqual(['death', 'deathDim', 'deathRubble', 'deathRubble'])
    expect(selectBossNativeKeyframe(at('windup', .5))).toBe('windupB')
    expect(selectBossNativeKeyframe(at('attack', .5))).toBe('slamB')
    expect(selectBossNativeKeyframe(at('attack', .9, 'eruption'))).toBeNull()
    expect(selectBossNativeKeyframe({ ...at('recover', .5), impacts: [] })).toBeNull()
    expect(selectBossNativeKeyframe(at('death', NaN))).toBeNull()
    expect(selectBossNativeKeyframe(at('death', 1.01))).toBeNull()
  })
  it('preserves the low rubble silhouette at the shared scale with reduced-motion fallback', () => {
    const image = { complete: true, naturalWidth: 1448, naturalHeight: 1086 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'deathRubble')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    const state = snapshot('death')
    const late = { ...state, bodyMotion: { ...state.bodyMotion!, progress: .9 } }
    expect(drawBossNativeKeyframe(ctx, image, late, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1448, 1086, -180.5, 4 - 889 / 4, 362, 271.5])
    expect(drawBossNativeKeyframe(ctx, image, late, 300, true)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('draws the registered collapse source with a common scale and rejects wrong dimensions, pose and reduced motion', () => {
    const image = { complete: true, naturalWidth: 1312, naturalHeight: 1199 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'death')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, snapshot('death'), 316.2)).toBe(true)
    const scale = 316.2 / 1200
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1312, 1199, -659 * scale, 4 - 1112 * scale, 1312 * scale, 1199 * scale])
    expect(drawBossNativeKeyframe(ctx, image, snapshot('death'), 316.2, true)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, snapshot('move'), 316.2)).toBe(false)
    const failed = { complete: true, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement
    registerBossNativeKeyframe(failed, 'death')
    expect(drawBossNativeKeyframe(ctx, failed, snapshot('death'), 316.2)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('loads only the selected boss keyframes in explicit mode 3, preserving canonical static art', async () => {
    const makeImage = () => ({ complete: false, src: '' }) as HTMLImageElement
    expect(loadWorldRuntimeImages(makeImage).bossNativeKeyframes).toBeUndefined()
    expect(loadWorldRuntimeImages(makeImage, 'abyss-monarch', 'native').bossNativeKeyframes).toBeUndefined()
    const review = loadWorldRuntimeImages(makeImage, 'infernal-titan', 'native')
    expect(Object.keys(review.bossNativeKeyframes ?? {})).toEqual(Object.keys(BOSS_NATIVE_KEYFRAMES))
    await vi.waitFor(() => {
      for (const key of Object.keys(BOSS_NATIVE_KEYFRAMES) as (keyof typeof BOSS_NATIVE_KEYFRAMES)[]) {
        expect(review.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
      }
    })
    expect(review.bosses['infernal-titan'].src).toBe(WORLD_ART.bosses['infernal-titan'])
    expect(review.bossMotionReference).toBeUndefined()
  })
})
