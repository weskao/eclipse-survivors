import { describe, expect, it } from 'vitest'
import type { SpecializationId } from '../../content/heroes'
import type { JobId } from '../../types'
import { createState, resetRun } from '../../state'
import { drawCharacter } from '../characters'
import { createFakeCtx, fakeArtwork } from '../fakes'
import type { ProductionHeroArtwork } from './production-heroes'

const HEROES: ReadonlyArray<[SpecializationId, JobId]> = [
  ['shadowblade', 'ranger'], ['spirit-summoner', 'wizard'], ['crimson-paladin', 'knight'],
]
const decoded = { complete: true, naturalWidth: 1024, naturalHeight: 512 } as HTMLImageElement
const pending = { complete: false, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement
const odd = { complete: true, naturalWidth: 77, naturalHeight: 33 } as HTMLImageElement

type Setup = (s: ReturnType<typeof createState>) => void
const POSES: ReadonlyArray<[string, Setup]> = [
  ['hurt', s => { s.hero!.inv = 0.8 }],
  ['death', s => { s.hero!.hp = 0 }],
  ['victory', s => { s.mode = 'result' }],
]

function render(id: SpecializationId, job: JobId, setup: Setup, image?: HTMLImageElement) {
  const s = createState()
  resetRun(s)
  s.mode = 'play'
  s.choice = job
  s.heroId = id
  s.W = 800; s.H = 600
  setup(s)
  const art = fakeArtwork(true)
  const { ctx, drawn } = createFakeCtx()
  drawCharacter(ctx, s, art, { knight: {}, ranger: {}, wizard: {} } as never, s.hero!, 100, 100, false,
    undefined, undefined, image ? { [id]: image } as unknown as ProductionHeroArtwork : undefined)
  return { art, drawn }
}

const legacy = (art: ReturnType<typeof fakeArtwork>): unknown[] => [art.knight, art.ranger, art.wizard]

describe('specialization heroes never render a legacy class body', () => {
  for (const [id, job] of HEROES) {
    for (const [pose, setup] of POSES) {
      it(`${id} (${job}) keeps its own atlas while ${pose}`, () => {
        const { art, drawn } = render(id, job, setup, decoded)
        expect(drawn).toContain(decoded)
        for (const image of legacy(art)) expect(drawn).not.toContain(image)
      })
    }
    for (const [label, image] of [['undecoded', pending], ['unexpected size', odd], ['missing', undefined]] as const) {
      it(`${id} (${job}) draws no class art when its atlas is ${label}`, () => {
        const { art, drawn } = render(id, job, () => {}, image)
        for (const body of legacy(art)) expect(drawn).not.toContain(body)
      })
    }
  }

  it('still draws the legacy rig for the original heroes', () => {
    const s = createState()
    resetRun(s)
    s.mode = 'play'; s.W = 800; s.H = 600
    const art = fakeArtwork(true)
    const { ctx, drawn } = createFakeCtx()
    drawCharacter(ctx, s, art, {}, s.hero!, 100, 100)
    expect(drawn).toContain(art.knight)
  })
})
