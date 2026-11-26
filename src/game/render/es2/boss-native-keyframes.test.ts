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
  it('selects the Batch 06 awakening only for the phase 2 transition and preserves its provisional anchor', () => {
    const state = snapshot('transform')
    const phase2: BossSnapshot = { ...state, phase: 2, bodyMotion: { ...state.bodyMotion!, phase: 2 } }
    const phase1: BossSnapshot = { ...state, phase: 1, bodyMotion: { ...state.bodyMotion!, phase: 1 } }
    expect(selectBossNativeKeyframe(phase2)).toBe('transformPhase2')
    expect(selectBossNativeKeyframe(state)).toBe('transform')
    expect(selectBossNativeKeyframe(phase1)).toBeNull()
    expect(selectBossNativeKeyframe({ ...phase2, id: 'abyss-monarch' })).toBeNull()
    const image = { complete: true, naturalWidth: 1374, naturalHeight: 1145 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'transformPhase2')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, phase2, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1374, 1145, -174.75, -274.5, 343.5, 286.25])
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, phase2, 300, true)).toBe(false)
    expect(calls).toHaveLength(1)
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
  it('reviews Abyss phase 1 shadow-fan windup without affecting other attacks or bosses', () => {
    const base = snapshot('windup', 'shadow-fan', 'abyss-monarch')
    const state: BossSnapshot = { ...base, phase: 1, bodyMotion: { ...base.bodyMotion!, phase: 1 } }
    expect(selectBossNativeKeyframe(state)).toBe('abyssWindup')
    expect(selectBossNativeKeyframe(base)).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, telegraphs: [] })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, id: 'frost-sovereign' })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, telegraphs: [{ ...cue, attackId: 'darkness-field', stage: 'warning' }] })).toBeNull()
    const image = { complete: true, naturalWidth: 1303, naturalHeight: 1207 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'abyssWindup')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1303, 1207, -163, -294.5, 325.75, 301.75])
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, base, 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('stages the Abyss phase 1 shadow-fan windup and release only for the actual attack', () => {
    const at = (pose: BossBodyPose, progress: number, attackId = 'shadow-fan', phase: 1 | 2 | 3 = 1): BossSnapshot => {
      const base = snapshot(pose, attackId, 'abyss-monarch')
      return { ...base, phase, bodyMotion: { ...base.bodyMotion!, phase, progress } }
    }
    expect([at('windup', 0), at('windup', .5), at('attack', 0), at('attack', .5)].map(selectBossNativeKeyframe))
      .toEqual(['abyssWindup', 'abyssWindupB', 'abyssReleaseA', 'abyssReleaseB'])
    expect(selectBossNativeKeyframe(at('attack', .9, 'darkness-field'))).toBeNull()
    expect(selectBossNativeKeyframe(at('attack', .9, 'shadow-fan', 2))).toBeNull()
    expect(selectBossNativeKeyframe(at('recover', .9))).toBe('abyssRecover')
    expect(selectBossNativeKeyframe(at('recover', .9, 'darkness-field'))).toBeNull()
    expect(selectBossNativeKeyframe(at('recover', .9, 'shadow-fan', 2))).toBeNull()
    expect(selectBossNativeKeyframe({ ...at('recover', .9), impacts: [] })).toBeNull()
    expect(selectBossNativeKeyframe({ ...at('attack', .5), impacts: [] })).toBeNull()
    const image = { complete: true, naturalWidth: 1312, naturalHeight: 1199 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'abyssReleaseA')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, at('attack', .25), 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1312, 1199, -165.125, -293.5, 328, 299.75])
    expect(drawBossNativeKeyframe(ctx, image, at('attack', .25), 300, true)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, at('attack', .75), 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('reviews Frost phase 1 ice-fan only and retains safe drawing fallbacks', () => {
    const base = snapshot('windup', 'ice-fan', 'frost-sovereign')
    const state: BossSnapshot = { ...base, phase: 1, bodyMotion: { ...base.bodyMotion!, phase: 1 } }
    expect(selectBossNativeKeyframe(state)).toBe('frostWindup')
    expect(selectBossNativeKeyframe(base)).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, phase: 2, bodyMotion: { ...state.bodyMotion!, phase: 2 } })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, telegraphs: [] })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, telegraphs: [{ ...cue, attackId: 'frost-patch', stage: 'warning' }] })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, id: 'eclipse-seraph' })).toBeNull()
    const image = { complete: true, naturalWidth: 1254, naturalHeight: 1254 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'frostWindup')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1254, 1254, -152.75, -306.75, 313.5, 313.5])
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    const bad = { complete: true, naturalWidth: 0, naturalHeight: 1254 } as HTMLImageElement
    registerBossNativeKeyframe(bad, 'frostWindup')
    expect(drawBossNativeKeyframe(ctx, bad, state, 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('selects only eligible Frost recovery/hurt and optional Batch 12 poses', () => {
    const at = (id: BossId, pose: BossBodyPose, attackId: string, phase: 1 | 2 | 3 = 1): BossSnapshot => {
      const base = snapshot(pose, attackId, id)
      return { ...base, phase, bodyMotion: { ...base.bodyMotion!, phase } }
    }
    expect(selectBossNativeKeyframe(at('frost-sovereign', 'recover', 'ice-fan'))).toBe('frostRecover')
    expect(selectBossNativeKeyframe(at('frost-sovereign', 'hurt', 'ice-fan'))).toBe('frostHurt')
    expect(selectBossNativeKeyframe(at('frost-sovereign', 'recover', 'frost-patch'))).toBeNull()
    expect(selectBossNativeKeyframe(at('frost-sovereign', 'hurt', 'ice-fan', 2))).toBeNull()
    expect(selectBossNativeKeyframe(at('abyss-monarch', 'idle', 'shadow-fan'))).toBe('abyssIdle')
    expect(selectBossNativeKeyframe(at('frost-sovereign', 'attack', 'ice-fan'))).toBe('frostRelease')
    expect(selectBossNativeKeyframe(at('frost-sovereign', 'attack', 'frost-patch'))).toBeNull()
    expect(selectBossNativeKeyframe(at('eclipse-seraph', 'windup', 'light-ring'))).toBe('seraphWindup')
    expect(selectBossNativeKeyframe(at('eclipse-seraph', 'windup', 'radiant-lance'))).toBeNull()
    expect(selectBossNativeKeyframe(at('eclipse-seraph', 'windup', 'light-ring', 3))).toBeNull()
    for (const [key, width, height, state] of [
      ['frostRecover', 1315, 1196, at('frost-sovereign', 'recover', 'ice-fan')],
      ['frostRelease', 1254, 1254, at('frost-sovereign', 'attack', 'ice-fan')],
      ['seraphWindup', 1254, 1254, at('eclipse-seraph', 'windup', 'light-ring')],
    ] as const) {
      const image = { complete: true, naturalWidth: width, naturalHeight: height } as HTMLImageElement
      registerBossNativeKeyframe(image, key)
      const calls: unknown[][] = []
      const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
      expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
      const failed = { complete: true, naturalWidth: 0, naturalHeight: height } as HTMLImageElement
      registerBossNativeKeyframe(failed, key)
      expect(drawBossNativeKeyframe(ctx, failed, state, 300)).toBe(false)
      expect(calls).toHaveLength(1)
    }
  })
  it('reviews the committed fallen Seraph only in phase 3 death', () => {
    const state = snapshot('death', 'light-ring', 'eclipse-seraph')
    const phase2: BossSnapshot = { ...state, phase: 2, bodyMotion: { ...state.bodyMotion!, phase: 2 } }
    expect(selectBossNativeKeyframe(state)).toBe('seraphDeath')
    expect(selectBossNativeKeyframe(phase2)).toBeNull()
    expect(selectBossNativeKeyframe(snapshot('move', 'light-ring', 'eclipse-seraph'))).toBeNull()
    const image = { complete: true, naturalWidth: 1254, naturalHeight: 1254 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'seraphDeath')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1254, 1254, -153.625, -302.25, 313.5, 313.5])
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, phase2, 300)).toBe(false)
    const bad = { complete: true, naturalWidth: 0, naturalHeight: 1254 } as HTMLImageElement
    registerBossNativeKeyframe(bad, 'seraphDeath')
    expect(drawBossNativeKeyframe(ctx, bad, state, 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('loads only the selected boss keyframes in explicit mode 3, preserving canonical static art', async () => {
    const makeImage = () => ({ complete: false, src: '' }) as HTMLImageElement
    expect(loadWorldRuntimeImages(makeImage).bossNativeKeyframes).toBeUndefined()
    // Batch 12 source files are delivered independently; exercise both absence and presence.
    const batch12 = import.meta.glob('../../../assets/es2/production/bosses/candidates/motion/native-keyframes/batch-12/*/**/*.webp')
    const present = (path: string) => !path.startsWith('batch-12/') || Object.hasOwn(batch12, '../../../assets/es2/production/bosses/candidates/motion/native-keyframes/' + path)
    const seraph = loadWorldRuntimeImages(makeImage, 'eclipse-seraph', 'native')
    const seraphKeys = (['seraphWindup', 'seraphDeath'] as const).filter(key => present(BOSS_NATIVE_KEYFRAMES[key][0]))
    expect(Object.keys(seraph.bossNativeKeyframes ?? {})).toEqual(seraphKeys)
    await vi.waitFor(() => {
      for (const key of seraphKeys)
        expect(seraph.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
    })
    expect(seraph.bosses['eclipse-seraph'].src).toBe(WORLD_ART.bosses['eclipse-seraph'])
    const frost = loadWorldRuntimeImages(makeImage, 'frost-sovereign', 'native')
    const frostKeys = (['frostWindup', 'frostRecover', 'frostHurt', 'frostRelease'] as const).filter(key => present(BOSS_NATIVE_KEYFRAMES[key][0]))
    expect(Object.keys(frost.bossNativeKeyframes ?? {})).toEqual(frostKeys)
    await vi.waitFor(() => {
      for (const key of frostKeys)
        expect(frost.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
    })
    expect(frost.bosses['frost-sovereign'].src).toBe(WORLD_ART.bosses['frost-sovereign'])
    const abyss = loadWorldRuntimeImages(makeImage, 'abyss-monarch', 'native')
    const abyssKeys = (Object.keys(BOSS_NATIVE_KEYFRAMES) as (keyof typeof BOSS_NATIVE_KEYFRAMES)[]).filter(key => BOSS_NATIVE_KEYFRAMES[key][0].includes('/abyss-monarch/') && present(BOSS_NATIVE_KEYFRAMES[key][0]))
    expect(Object.keys(abyss.bossNativeKeyframes ?? {})).toEqual(abyssKeys)
    await vi.waitFor(() => {
      for (const key of abyssKeys)
        expect(abyss.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
    })
    expect(abyss.bosses['abyss-monarch'].src).toBe(WORLD_ART.bosses['abyss-monarch'])
    const review = loadWorldRuntimeImages(makeImage, 'infernal-titan', 'native')
    const titanKeys = (Object.keys(BOSS_NATIVE_KEYFRAMES) as (keyof typeof BOSS_NATIVE_KEYFRAMES)[]).filter(key => BOSS_NATIVE_KEYFRAMES[key][0].includes('/infernal-titan/'))
    expect(Object.keys(review.bossNativeKeyframes ?? {})).toEqual(titanKeys)
    await vi.waitFor(() => {
      for (const key of titanKeys) {
        expect(review.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
      }
    })
    expect(review.bosses['infernal-titan'].src).toBe(WORLD_ART.bosses['infernal-titan'])
    expect(review.bossMotionReference).toBeUndefined()
  })
})
