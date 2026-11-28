import { describe, expect, it, vi } from 'vitest'
import { BOSS_NATIVE_KEYFRAMES, selectBossNativeKeyframe, drawBossNativeKeyframe, registerBossNativeKeyframe } from './boss-native-keyframes'
import { loadWorldRuntimeImages, WORLD_ART } from './production-world'
import { createBossEncounterController, type BossSnapshot, type BossBodyPose } from '../../content/bosses/controller'
import { createHero, createState } from '../../state'
import type { GameHooks } from '../../types'
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
    expect(selectBossNativeKeyframe(snapshot('death', 'titan-slam', 'abyss-monarch'))).toBe('abyssDeath')
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
    expect(selectBossNativeKeyframe({ ...phase2, id: 'abyss-monarch' })).toBe('abyssAwakeningPhase2')
    expect(selectBossNativeKeyframe({ ...phase2, id: 'frost-sovereign' })).toBe('frostAwakeningPhase2')
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
    expect(selectBossNativeKeyframe(at('frost-sovereign', 'hurt', 'ice-fan', 2))).toBe('frostHurtPhase2')
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
  it('reviews the committed Batch 17 Abyss hurt and Seraph release poses only in phase 1', () => {
    const at = (id: BossId, pose: BossBodyPose, attackId = 'light-ring', phase: 1 | 2 | 3 = 1): BossSnapshot => {
      const base = snapshot(pose, attackId, id)
      return { ...base, phase, bodyMotion: { ...base.bodyMotion!, phase } }
    }
    const hurt = at('abyss-monarch', 'hurt')
    const release = at('eclipse-seraph', 'attack')
    expect(selectBossNativeKeyframe(hurt)).toBe('abyssHurt')
    expect(selectBossNativeKeyframe({ ...hurt, impacts: [] })).toBe('abyssHurt')
    expect(selectBossNativeKeyframe(release)).toBe('seraphRelease')
    expect(selectBossNativeKeyframe(at('abyss-monarch', 'hurt', 'shadow-fan', 2))).toBeNull()
    expect(selectBossNativeKeyframe(at('eclipse-seraph', 'attack', 'light-ring', 2))).toBeNull()
    expect(selectBossNativeKeyframe(at('eclipse-seraph', 'attack', 'radiant-lance'))).toBeNull()
    expect(selectBossNativeKeyframe({ ...release, impacts: [] })).toBeNull()
    expect(selectBossNativeKeyframe(at('eclipse-seraph', 'windup'))).toBe('seraphWindup')
    expect(selectBossNativeKeyframe(at('eclipse-seraph', 'death', 'light-ring', 3))).toBe('seraphDeath')
    expect(selectBossNativeKeyframe(at('abyss-monarch', 'recover', 'shadow-fan'))).toBe('abyssRecover')
    for (const [key, state, dx, dy] of [
      ['abyssHurt', hurt, -159.625, -303.75],
      ['seraphRelease', release, -156, -304.75],
    ] as const) {
      const image = { complete: true, naturalWidth: 1254, naturalHeight: 1254 } as HTMLImageElement
      registerBossNativeKeyframe(image, key)
      const calls: unknown[][] = []
      const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
      expect(calls[0]?.slice(1)).toEqual([0, 0, 1254, 1254, dx, dy, 313.5, 313.5])
      expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
      expect(drawBossNativeKeyframe(ctx, image, key === 'abyssHurt' ? release : hurt, 300)).toBe(false)
      const bad = { complete: true, naturalWidth: 0, naturalHeight: 1254 } as HTMLImageElement
      registerBossNativeKeyframe(bad, key)
      expect(drawBossNativeKeyframe(ctx, bad, state, 300)).toBe(false)
      expect(calls).toHaveLength(1)
    }
  })
  it('reviews Batch 18 Abyss dissolve only during phase 3 death', () => {
    const state = snapshot('death', 'shadow-fan', 'abyss-monarch')
    const earlier = (phase: 1 | 2): BossSnapshot => ({ ...state, phase, bodyMotion: { ...state.bodyMotion!, phase } })
    expect(selectBossNativeKeyframe({ ...state, impacts: [] })).toBe('abyssDeath')
    expect(selectBossNativeKeyframe(earlier(1))).toBeNull()
    expect(selectBossNativeKeyframe(earlier(2))).toBeNull()
    expect(selectBossNativeKeyframe(snapshot('idle', 'shadow-fan', 'abyss-monarch'))).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: 1.1 } })).toBeNull()
    const image = { complete: true, naturalWidth: 1254, naturalHeight: 1254 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'abyssDeath')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1254, 1254, -158.125, -300.25, 313.5, 313.5])
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, earlier(2), 300)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, snapshot('death', 'light-ring', 'eclipse-seraph'), 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('reviews east-only Abyss and Seraph glide candidates during phase 1 pursuit, never mirrored', () => {
    const glide = (id: BossId, facingX: -1 | 1 | undefined, progress = .25, phase: 1 | 2 | 3 = 1): BossSnapshot => {
      const base = snapshot('move', 'shadow-fan', id)
      return { ...base, phase, bodyMotion: { ...base.bodyMotion!, phase, progress, facingX } }
    }
    expect(selectBossNativeKeyframe(glide('abyss-monarch', 1))).toBe('abyssMove')
    expect(selectBossNativeKeyframe(glide('eclipse-seraph', 1))).toBe('seraphMove')
    expect(selectBossNativeKeyframe(glide('eclipse-seraph', 1, .5))).toBe('seraphMoveB')
    // mirrorAllowed: false — a westward glide keeps the production phase frame.
    expect(selectBossNativeKeyframe(glide('abyss-monarch', -1))).toBeNull()
    expect(selectBossNativeKeyframe(glide('eclipse-seraph', -1))).toBeNull()
    expect(selectBossNativeKeyframe(glide('abyss-monarch', undefined))).toBeNull()
    expect(selectBossNativeKeyframe(glide('abyss-monarch', 1, .25, 2))).toBeNull()
    expect(selectBossNativeKeyframe(glide('eclipse-seraph', 1, .25, 3))).toBeNull()
    expect(selectBossNativeKeyframe(glide('frost-sovereign', 1))).toBeNull()
    for (const [key, state, w, h, dx, dy] of [
      ['abyssMove', glide('abyss-monarch', 1), 1313, 1198, -149.5, -288.75],
      ['seraphMove', glide('eclipse-seraph', 1), 1312, 1199, -163.125, -290.75],
      ['seraphMoveB', glide('eclipse-seraph', 1, .75), 1312, 1199, -162.5, -287.75],
    ] as const) {
      const image = { complete: true, naturalWidth: w, naturalHeight: h } as HTMLImageElement
      registerBossNativeKeyframe(image, key)
      const calls: unknown[][] = []
      const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
      expect(calls[0]?.slice(1)).toEqual([0, 0, w, h, dx, dy, w / 4, h / 4])
      expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
      expect(drawBossNativeKeyframe(ctx, image, { ...state, bodyMotion: { ...state.bodyMotion!, facingX: -1 } }, 300)).toBe(false)
      expect(calls).toHaveLength(1)
    }
  })
  it.each([['abyss-monarch', ['abyssMove']], ['eclipse-seraph', ['seraphMove', 'seraphMoveB']]] as const)(
    '%s: real encounter pursuit reaches the east glide only while travelling east', (id, eastKeys) => {
      for (const [x, expected] of [[-520, eastKeys], [520, []]] as const) {
        const controller = createBossEncounterController({})
        const state = createState()
        state.mode = 'play'
        state.hero = createHero('knight')
        state.hero.inv = 100
        const hooks = { end: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), sfx: vi.fn() } as unknown as GameHooks
        controller.spawn(state, id, { x, y: 0 }, hooks)
        const seen = new Set<string>()
        let drawn = 0
        for (let i = 0; i < 120; i++) {
          state.worldClock += 0.05 // step() owns the clock in the real loop
          controller.tick(state, 0.05, hooks)
          const snap = controller.snapshot(state)
          if (snap.bodyMotion?.pose !== 'move') continue
          const key = selectBossNativeKeyframe(snap)
          if (!key) continue
          seen.add(key)
          const [, w, h] = BOSS_NATIVE_KEYFRAMES[key]
          const image = { complete: true, naturalWidth: w, naturalHeight: h } as HTMLImageElement
          registerBossNativeKeyframe(image, key)
          if (drawBossNativeKeyframe({ drawImage: () => {} } as unknown as Ctx2D, image, snap, 300)) drawn++
        }
        expect([...seen].sort()).toEqual([...expected])
        expect(drawn > 0).toBe(expected.length > 0)
      }
    })
  it('reviews the Batch 21 Seraph hurt pose only in phase 1 with existing fallbacks', () => {
    const base = snapshot('hurt', 'light-ring', 'eclipse-seraph')
    const at = (phase: 1 | 2 | 3): BossSnapshot => ({
      ...base, phase, impacts: [], bodyMotion: { ...base.bodyMotion!, phase },
    })
    const state = at(1)
    expect(selectBossNativeKeyframe(state)).toBe('seraphHurt')
    expect(selectBossNativeKeyframe(at(2))).toBeNull()
    expect(selectBossNativeKeyframe(at(3))).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, pose: 'idle' } })).toBeNull()
    const image = { complete: true, naturalWidth: 1197, naturalHeight: 1452 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'seraphHurt')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1197, 1452, -149.25, -336.75, 299.25, 363])
    expect(drawBossNativeKeyframe(ctx, image, at(2), 300)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    const failed = { complete: true, naturalWidth: 0, naturalHeight: 1452 } as HTMLImageElement
    registerBossNativeKeyframe(failed, 'seraphHurt')
    expect(drawBossNativeKeyframe(ctx, failed, state, 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('reviews Batch 22 awakening and collapse only in their provisional phase 3 states', () => {
    const awakening = snapshot('transform', 'shadow-fan', 'abyss-monarch')
    const death = snapshot('death', 'ice-fan', 'frost-sovereign')
    const earlier = (state: BossSnapshot, phase: 1 | 2): BossSnapshot => ({
      ...state, phase, bodyMotion: { ...state.bodyMotion!, phase },
    })
    expect(selectBossNativeKeyframe(awakening)).toBe('abyssAwakening')
    expect(selectBossNativeKeyframe(death)).toBe('frostDeath')
    for (const state of [awakening, death]) {
      expect(selectBossNativeKeyframe(earlier(state, 1))).toBeNull()
      expect(selectBossNativeKeyframe(earlier(state, 2))).toBe(state === awakening ? 'abyssAwakeningPhase2' : null)
      expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, pose: 'idle' } })).toBeNull()
      expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } })).toBeNull()
      expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: 1.1 } })).toBeNull()
      expect(selectBossNativeKeyframe({ ...state, phase: 2 })).toBeNull()
    }
    for (const [key, state, dx, dy] of [
      ['abyssAwakening', awakening, -164.25, -314.5],
      ['frostDeath', death, -165.5, -288.5],
    ] as const) {
      const image = { complete: true, naturalWidth: 1318, naturalHeight: 1318 } as HTMLImageElement
      registerBossNativeKeyframe(image, key)
      const calls: unknown[][] = []
      const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
      expect(calls[0]?.slice(1)).toEqual([0, 0, 1318, 1318, dx, dy, 329.5, 329.5])
      expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
      expect(drawBossNativeKeyframe(ctx, image, key === 'abyssAwakening' ? death : awakening, 300)).toBe(false)
      const failed = { complete: true, naturalWidth: 0, naturalHeight: 1318 } as HTMLImageElement
      registerBossNativeKeyframe(failed, key)
      expect(drawBossNativeKeyframe(ctx, failed, state, 300)).toBe(false)
      expect(calls).toHaveLength(1)
    }
  })
  it('reviews Batch 23 Seraph recovery, eclipse idle and ascension only in their intended states', () => {
    const at = (pose: BossBodyPose, phase: 1 | 2 | 3, attackId = 'light-ring'): BossSnapshot => {
      const base = snapshot(pose, attackId, 'eclipse-seraph')
      return { ...base, phase, bodyMotion: { ...base.bodyMotion!, phase } }
    }
    const recover = at('recover', 1)
    const idle = at('idle', 3)
    const transform = at('transform', 3)
    expect(selectBossNativeKeyframe(recover)).toBe('seraphRecover')
    expect(selectBossNativeKeyframe(idle)).toBe('seraphIdle')
    expect(selectBossNativeKeyframe(transform)).toBe('seraphAscension')
    expect(selectBossNativeKeyframe(at('recover', 1, 'radiant-lance'))).toBeNull()
    expect(selectBossNativeKeyframe({ ...recover, impacts: [] })).toBeNull()
    expect(selectBossNativeKeyframe(at('recover', 2))).toBeNull()
    expect(selectBossNativeKeyframe(at('idle', 1))).toBeNull()
    expect(selectBossNativeKeyframe(at('idle', 2))).toBeNull()
    expect(selectBossNativeKeyframe(at('transform', 2))).toBe('seraphAwakeningPhase2')
    for (const [key, state, w, h, dx, dy] of [
      ['seraphRecover', recover, 1197, 1452, -147.25, -344.5],
      ['seraphIdle', idle, 1194, 1456, -149.25, -351.5],
      ['seraphAscension', transform, 1263, 1376, -158.25, -331.5],
    ] as const) {
      const image = { complete: true, naturalWidth: w, naturalHeight: h } as HTMLImageElement
      registerBossNativeKeyframe(image, key)
      const calls: unknown[][] = []
      const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
      expect(calls[0]?.slice(1)).toEqual([0, 0, w, h, dx, dy, w / 4, h / 4])
      expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
      expect(drawBossNativeKeyframe(ctx, image, { ...state, phase: 2 }, 300)).toBe(false)
      expect(drawBossNativeKeyframe(ctx, image, { ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } }, 300)).toBe(false)
      const failed = { complete: true, naturalWidth: 0, naturalHeight: h } as HTMLImageElement
      registerBossNativeKeyframe(failed, key)
      expect(drawBossNativeKeyframe(ctx, failed, state, 300)).toBe(false)
      expect(calls).toHaveLength(1)
    }
  })
  it('reviews Batch 24 Frost awakening only during phase 3 transformation', () => {
    const state = snapshot('transform', 'ice-fan', 'frost-sovereign')
    const at = (pose: BossBodyPose, phase: 1 | 2 | 3): BossSnapshot => ({
      ...state, phase, bodyMotion: { ...state.bodyMotion!, pose, phase },
    })
    expect(selectBossNativeKeyframe(state)).toBe('frostAwakening')
    expect(selectBossNativeKeyframe(at('transform', 1))).toBeNull()
    expect(selectBossNativeKeyframe(at('transform', 2))).toBe('frostAwakeningPhase2')
    expect(selectBossNativeKeyframe(at('move', 3))).toBeNull()
    expect(selectBossNativeKeyframe(at('move', 2))).toBeNull()
    expect(selectBossNativeKeyframe(at('death', 3))).toBe('frostDeath')
    const image = { complete: true, naturalWidth: 1235, naturalHeight: 1407 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'frostAwakening')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1235, 1407, -152.5, -332.5, 308.75, 351.75])
    expect(drawBossNativeKeyframe(ctx, image, at('transform', 2), 300)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, { ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } }, 300)).toBe(false)
    const failed = { complete: true, naturalWidth: 0, naturalHeight: 1407 } as HTMLImageElement
    registerBossNativeKeyframe(failed, 'frostAwakening')
    expect(drawBossNativeKeyframe(ctx, failed, state, 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('reviews Batch 25 Abyss phase 2 transformation without replacing phase 3 art', () => {
    const base = snapshot('transform', 'shadow-fan', 'abyss-monarch')
    const state: BossSnapshot = { ...base, phase: 2, bodyMotion: { ...base.bodyMotion!, phase: 2 } }
    expect(selectBossNativeKeyframe(state)).toBe('abyssAwakeningPhase2')
    expect(selectBossNativeKeyframe(base)).toBe('abyssAwakening')
    expect(selectBossNativeKeyframe({ ...state, phase: 1, bodyMotion: { ...state.bodyMotion!, phase: 1 } })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, pose: 'idle' } })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, id: 'frost-sovereign' })).toBe('frostAwakeningPhase2')
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } })).toBeNull()
    const image = { complete: true, naturalWidth: 1376, naturalHeight: 1263 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'abyssAwakeningPhase2')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1376, 1263, -160.875, -300.5, 344, 315.75])
    expect(drawBossNativeKeyframe(ctx, image, base, 300)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    expect(calls).toHaveLength(1)
    // Batch 25 key-b continues the same phase-2 awakening in the second half of the pose.
    const late: BossSnapshot = { ...state, bodyMotion: { ...state.bodyMotion!, progress: .75 } }
    expect(selectBossNativeKeyframe(late)).toBe('abyssAwakeningPhase2B')
    expect(BOSS_NATIVE_KEYFRAMES.abyssAwakeningPhase2B[0]).toBe('batch-25/abyss-monarch/transform/abyss-phase2-awakening-key-b.webp')
    const imageB = { complete: true, naturalWidth: 1359, naturalHeight: 1278 } as HTMLImageElement
    registerBossNativeKeyframe(imageB, 'abyssAwakeningPhase2B')
    expect(drawBossNativeKeyframe(ctx, imageB, state, 300)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, imageB, late, 300)).toBe(true)
    expect(calls[1]?.slice(1)).toEqual([0, 0, 1359, 1278, -167.125, -301.75, 339.75, 319.5])
  })
  it('keeps QA-blocked Batch 24 frost glide and Batch 26 titan studies out of runtime keyframes', () => {
    // frost-glide: directional move pose, direction/phase not approved, mirror forbidden.
    // titan Batch 26: identity mismatch with canonical armor, horns and skirt silhouette.
    const paths = Object.values(BOSS_NATIVE_KEYFRAMES).map(([path]) => path)
    expect(paths.some(path => path.startsWith('batch-26/'))).toBe(false)
    expect(paths.some(path => path.includes('frost-glide'))).toBe(false)
  })
  it('reviews Batch 27 phase 2 awakenings without substituting other phases or poses', () => {
    for (const [id, key, dx, dy] of [
      ['frost-sovereign', 'frostAwakeningPhase2', -164.25, -314.25],
      ['eclipse-seraph', 'seraphAwakeningPhase2', -165, -315.25],
    ] as const) {
      const base = snapshot('transform', 'titan-slam', id)
      const state: BossSnapshot = { ...base, phase: 2, bodyMotion: { ...base.bodyMotion!, phase: 2 } }
      expect(selectBossNativeKeyframe(state)).toBe(key)
      expect(selectBossNativeKeyframe({ ...state, phase: 1, bodyMotion: { ...state.bodyMotion!, phase: 1 } })).toBeNull()
      expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, pose: 'move' } })).toBeNull()
      expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } })).toBeNull()
      const image = { complete: true, naturalWidth: 1318, naturalHeight: 1318 } as HTMLImageElement
      registerBossNativeKeyframe(image, key)
      const calls: unknown[][] = []
      const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
      expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
      expect(calls[0]?.slice(1)).toEqual([0, 0, 1318, 1318, dx, dy, 329.5, 329.5])
      expect(drawBossNativeKeyframe(ctx, image, base, 300)).toBe(false)
      expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
      const failed = { complete: true, naturalWidth: 0, naturalHeight: 1318 } as HTMLImageElement
      registerBossNativeKeyframe(failed, key)
      expect(drawBossNativeKeyframe(ctx, failed, state, 300)).toBe(false)
      expect(calls).toHaveLength(1)
    }
  })
  it('keeps Batch 27 unapproved direction, attack and alternative studies out of the runtime map', () => {
    const paths = Object.values(BOSS_NATIVE_KEYFRAMES).map(([path]) => path).filter(path => path.startsWith('batch-27/'))
    expect(paths).toEqual([
      'batch-27/frost-sovereign/transform/frost-phase2-awakening-study-a.webp',
      'batch-27/eclipse-seraph/transform/seraph-phase2-awakening-study-a.webp',
    ])
  })
  it('reviews the Batch 28 Frost hurt pose only in phase 2', () => {
    const base = snapshot('hurt', 'ice-fan', 'frost-sovereign')
    const state: BossSnapshot = { ...base, phase: 2, bodyMotion: { ...base.bodyMotion!, phase: 2 } }
    expect(selectBossNativeKeyframe(state)).toBe('frostHurtPhase2')
    expect(selectBossNativeKeyframe(base)).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, phase: 1, bodyMotion: { ...state.bodyMotion!, phase: 1 } })).toBe('frostHurt')
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, pose: 'move' } })).toBeNull()
    expect(selectBossNativeKeyframe({ ...state, bodyMotion: { ...state.bodyMotion!, progress: NaN } })).toBeNull()
    const image = { complete: true, naturalWidth: 1318, naturalHeight: 1318 } as HTMLImageElement
    registerBossNativeKeyframe(image, 'frostHurtPhase2')
    const calls: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => calls.push(args) } as unknown as Ctx2D
    expect(drawBossNativeKeyframe(ctx, image, state, 300)).toBe(true)
    expect(calls[0]?.slice(1)).toEqual([0, 0, 1318, 1318, -160.125, -312.5, 329.5, 329.5])
    expect(drawBossNativeKeyframe(ctx, image, base, 300)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, image, state, 300, true)).toBe(false)
    expect(drawBossNativeKeyframe(ctx, { complete: false } as HTMLImageElement, state, 300)).toBe(false)
    expect(calls).toHaveLength(1)
  })
  it('loads only the selected boss keyframes in explicit mode 3, preserving canonical static art', async () => {
    // Cold Vite ?url transforms of a dozen 1.2k WebPs exceed waitFor's 1 s default.
    const LOAD_WAIT = { timeout: 15_000 }
    const makeImage = () => ({ complete: false, src: '' }) as HTMLImageElement
    expect(loadWorldRuntimeImages(makeImage).bossNativeKeyframes).toBeUndefined()
    // Batch 12 source files are delivered independently; exercise both absence and presence.
    const batch12 = import.meta.glob('../../../assets/es2/production/bosses/candidates/motion/native-keyframes/batch-12/*/**/*.webp')
    const present = (path: string) => !path.startsWith('batch-12/') || Object.hasOwn(batch12, '../../../assets/es2/production/bosses/candidates/motion/native-keyframes/' + path)
    const seraph = loadWorldRuntimeImages(makeImage, 'eclipse-seraph', 'native')
    const seraphKeys = (['seraphWindup', 'seraphRelease', 'seraphHurt', 'seraphDeath', 'seraphMove', 'seraphMoveB', 'seraphRecover', 'seraphIdle', 'seraphAscension', 'seraphAwakeningPhase2'] as const).filter(key => present(BOSS_NATIVE_KEYFRAMES[key][0]))
    expect(Object.keys(seraph.bossNativeKeyframes ?? {})).toEqual(seraphKeys)
    await vi.waitFor(() => {
      for (const key of seraphKeys)
        expect(seraph.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
    }, LOAD_WAIT)
    expect(seraph.bosses['eclipse-seraph'].src).toBe(WORLD_ART.bosses['eclipse-seraph'])
    const frost = loadWorldRuntimeImages(makeImage, 'frost-sovereign', 'native')
    const frostKeys = (['frostWindup', 'frostRecover', 'frostHurt', 'frostRelease', 'frostDeath', 'frostAwakening', 'frostAwakeningPhase2', 'frostHurtPhase2'] as const).filter(key => present(BOSS_NATIVE_KEYFRAMES[key][0]))
    expect(Object.keys(frost.bossNativeKeyframes ?? {})).toEqual(frostKeys)
    await vi.waitFor(() => {
      for (const key of frostKeys)
        expect(frost.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
    }, LOAD_WAIT)
    expect(frost.bosses['frost-sovereign'].src).toBe(WORLD_ART.bosses['frost-sovereign'])
    const abyss = loadWorldRuntimeImages(makeImage, 'abyss-monarch', 'native')
    const abyssKeys = (Object.keys(BOSS_NATIVE_KEYFRAMES) as (keyof typeof BOSS_NATIVE_KEYFRAMES)[]).filter(key => BOSS_NATIVE_KEYFRAMES[key][0].includes('/abyss-monarch/') && present(BOSS_NATIVE_KEYFRAMES[key][0]))
    expect(Object.keys(abyss.bossNativeKeyframes ?? {})).toEqual(abyssKeys)
    await vi.waitFor(() => {
      for (const key of abyssKeys)
        expect(abyss.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
    }, LOAD_WAIT)
    expect(abyss.bosses['abyss-monarch'].src).toBe(WORLD_ART.bosses['abyss-monarch'])
    const review = loadWorldRuntimeImages(makeImage, 'infernal-titan', 'native')
    const titanKeys = (Object.keys(BOSS_NATIVE_KEYFRAMES) as (keyof typeof BOSS_NATIVE_KEYFRAMES)[]).filter(key => BOSS_NATIVE_KEYFRAMES[key][0].includes('/infernal-titan/'))
    expect(Object.keys(review.bossNativeKeyframes ?? {})).toEqual(titanKeys)
    await vi.waitFor(() => {
      for (const key of titanKeys) {
        expect(review.bossNativeKeyframes?.[key]?.src).toContain(BOSS_NATIVE_KEYFRAMES[key][0].split('/').at(-1)!)
      }
    }, LOAD_WAIT)
    expect(review.bosses['infernal-titan'].src).toBe(WORLD_ART.bosses['infernal-titan'])
    expect(review.bossMotionReference).toBeUndefined()
  }, 60_000)
})
