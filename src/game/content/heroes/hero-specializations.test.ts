import { describe, expect, it, vi } from 'vitest'
import { setLocale, t } from '../../../i18n'
import { BALANCE } from '../../config'
import { installHallRun } from '../meta/hall-runtime'
import hallTuning from '../../balance/hall-effect-tuning.json'
import { createContentRegistry } from '../registry'
import { createHero, createState, resetRun } from '../../state'
import type { GameHooks, Mob } from '../../types'
import {
  HERO_DEFINITIONS, HERO_SPECIALIZATIONS_PACK, createHeroSpecializationAdapter,
  type SpecializationId,
} from './index'

const hooks: GameHooks = {
  sfx: vi.fn(), message: vi.fn(), offerUpgrades: vi.fn(), end: vi.fn(),
}

const mob = (x = 50, y = 0, hp = 150): Mob => ({
  x, y, hp, max: hp, type: 'slime', r: 15, speed: 0, dmg: 5,
  phase: 0, hit: 0, slow: 0, stagger: 0, kx: 0, ky: 0,
})

function setup(id: SpecializationId, random: () => number = () => 0.9) {
  const state = createState()
  state.mode = 'play'
  const adapter = createHeroSpecializationAdapter(state, id, hooks, random)
  adapter.reset()
  const registry = createContentRegistry([HERO_SPECIALIZATIONS_PACK], random)
  return { state, adapter, registry }
}

describe('isolated hero specializations', () => {
  it('defines three unique illustrated selection records without changing built-in job ids', () => {
    expect(Object.keys(HERO_DEFINITIONS)).toEqual(['shadowblade', 'spirit-summoner', 'crimson-paladin'])
    const records = Object.values(HERO_DEFINITIONS)
    expect(new Set(records.map(hero => hero.startingAbility))).toHaveProperty('size', 3)
    expect(new Set(records.map(hero => hero.portraitSrc))).toHaveProperty('size', 3)
    for (const def of records) {
      expect(def.portraitSrc).toContain(def.id + '-portrait@3x.webp')
      expect(def.specialCooldown).toBeGreaterThan(1)
      expect(def.strengths.length).toBeGreaterThan(0)
      expect(def.weaknesses.length).toBeGreaterThan(0)
      expect(def.animation.attack).toBeTruthy()
      expect(def.audio.special).toBeTruthy()
    }
  })

  it('fills the Blood Oath Barrier duration from balance data in both locales', () => {
    const paladin = HERO_DEFINITIONS['crimson-paladin']
    const seconds = BALANCE.heroes.specialEffects['crimson-paladin'].barrierSeconds
    const storage = { getItem: () => null, setItem: () => {} }
    // Numbers come from heroes.json through t() params, never as literals in the copy.
    for (const def of Object.values(HERO_DEFINITIONS)) expect(def.special).not.toMatch(/\d/)
    expect(paladin.specialParams).toEqual({ seconds })
    try {
      setLocale('zh-TW', storage)
      expect(t(paladin.special, paladin.specialParams)).toContain(`換取 ${seconds} 秒的吸收護盾`)
      setLocale('en', storage)
      expect(t(paladin.special, paladin.specialParams)).toContain(`a ${seconds}-second absorbing shield`)
    } finally {
      setLocale('zh-TW', storage)
    }
    // The starting-ability card title is translated without params, so it carries the name only.
    const title = HERO_SPECIALIZATIONS_PACK.abilities?.find(a => a.id === paladin.startingAbility)?.title
    expect(title).toBe('緋紅聖騎 · 血誓屏障')
  })

  it.each(Object.keys(HERO_DEFINITIONS) as SpecializationId[])(
    'initializes %s with fair stats and one owned starting ability',
    id => {
      const { state, registry, adapter } = setup(id)
      const def = HERO_DEFINITIONS[id]
      expect(state.choice).toBe(def.legacyArtJob)
      expect(state.hero?.max).toBe(def.stats.hp)
      expect(state.hero?.hp).toBe(def.stats.hp)
      expect(state.hero?.speed).toBe(def.stats.speed)
      expect(state.hero?.damage).toBe(def.stats.damage)
      expect(state.hero?.delay).toBe(def.stats.delay)
      expect(state.hero?.range).toBe(def.stats.range)
      expect(state.content.levels[def.startingAbility]).toBe(1)
      expect(registry.getAbility(def.startingAbility)).toBeDefined()
      expect(registry.eligible(state).map(a => a.id)).toContain(def.progressionAbility)
      expect(adapter.snapshot().cooldown).toBe(0)
    },
  )

  it('locks progression to the selected hero and improves its specialty', () => {
    const { state, registry, adapter } = setup('shadowblade', () => 0.15)
    const def = HERO_DEFINITIONS.shadowblade
    expect(registry.eligible(state).filter(a => a.id.startsWith('heroes:'))).toHaveLength(1)
    const base = adapter.modifyOutgoingDamage(20)
    expect(registry.acquire(state, def.progressionAbility, hooks)).toBe(true)
    expect(adapter.modifyOutgoingDamage(20)).toBeGreaterThan(base)
    expect(registry.acquire(state, 'heroes:spirit-bond', hooks)).toBe(false)
  })

  it('raises Shadowblade critical chance while retaining the original damage multiplier', () => {
    const { adapter } = setup('shadowblade', () => 0.26)
    expect(adapter.modifyOutgoingDamage(20)).toBe(34)
    expect(adapter.consumeCriticalHit()).toBe(true)
    expect(adapter.consumeCriticalHit()).toBe(false)
    const normal = setup('shadowblade', () => 0.29).adapter
    expect(normal.modifyOutgoingDamage(20)).toBe(20)
    expect(normal.consumeCriticalHit()).toBe(false)
  })

  it('shadowblade has deterministic crits, short stealth, shadow strikes, and cooldown gating', () => {
    const { state, adapter } = setup('shadowblade', () => 0.1)
    expect(adapter.modifyOutgoingDamage(20)).toBe(34)
    state.mobs.push(mob(50), mob(85), mob(120), mob(180))
    expect(adapter.activate()).toBe(true)
    expect(adapter.activate()).toBe(false)
    expect(adapter.snapshot().stealth).toBeGreaterThan(0)
    expect(state.hero!.inv).toBeGreaterThan(0)
    expect(state.mobs.slice(0, 3).every(enemy => enemy.hp < enemy.max)).toBe(true)
    expect(state.mobs[3]!.hp).toBe(150)
    adapter.tick(1)
    expect(adapter.snapshot().stealth).toBe(0)
    adapter.tick(HERO_DEFINITIONS.shadowblade.specialCooldown)
    expect(adapter.activate()).toBe(true)
  })

  it('spirit summoner maintains bounded distinct companions, scales with level, and supports survival', () => {
    const { state, adapter } = setup('spirit-summoner')
    expect(adapter.snapshot().companions).toEqual(['wisp'])
    state.mobs.push(mob(30))
    adapter.tick(2)
    expect(state.mobs[0]!.hp).toBeLessThan(150)
    state.hero!.level = 3
    adapter.tick(2)
    expect(adapter.snapshot().companions).toEqual(['wisp', 'guardian'])
    state.hero!.hp -= 20
    adapter.tick(2)
    expect(state.hero!.hp).toBeGreaterThan(HERO_DEFINITIONS['spirit-summoner'].stats.hp - 20)
    state.hero!.level = 5
    adapter.tick(2)
    expect(adapter.snapshot().companions).toEqual(['wisp', 'guardian', 'reaver'])
    expect(adapter.modifyOutgoingDamage(20)).toBeGreaterThan(20)
    expect(adapter.activate()).toBe(true)
    expect(adapter.activate()).toBe(false)
    expect(adapter.snapshot().companions).toHaveLength(3)
  })

  it('crimson paladin reduces hits, consumes temporary barrier, and counters near attackers', () => {
    const { state, adapter } = setup('crimson-paladin')
    const enemy = mob(65)
    state.mobs.push(enemy)
    expect(adapter.mitigateIncomingDamage(20)).toBeCloseTo(17.2)
    adapter.afterDamage(17.2)
    expect(enemy.hp).toBeLessThan(150)
    const first = enemy.hp
    adapter.afterDamage(17.2)
    expect(enemy.hp).toBe(first)
    expect(adapter.activate()).toBe(true)
    expect(adapter.activate()).toBe(false)
    expect(adapter.snapshot().barrier).toBeGreaterThan(0)
    expect(adapter.mitigateIncomingDamage(25)).toBe(0)
    adapter.tick(4)
    expect(adapter.snapshot().barrier).toBe(0)
    state.hero!.hp = 20
    expect(adapter.modifyOutgoingDamage(20)).toBeGreaterThan(20)
  })

  it('strengthens all three specialization rank benefits without lifting their max rank', () => {
    const shadow = setup('shadowblade', () => 0.1)
    for (let i = 0; i < 3; i++) expect(shadow.registry.acquire(shadow.state, 'heroes:shadow-precision', hooks)).toBe(true)
    expect(shadow.adapter.modifyOutgoingDamage(20)).toBeCloseTo(44.8)
    expect(shadow.registry.acquire(shadow.state, 'heroes:shadow-precision', hooks)).toBe(false)

    const spirit = setup('spirit-summoner')
    spirit.state.hero!.level = 3
    spirit.state.hero!.hp = 50
    for (let i = 0; i < 3; i++) expect(spirit.registry.acquire(spirit.state, 'heroes:spirit-bond', hooks)).toBe(true)
    spirit.adapter.tick(1.8)
    expect(spirit.state.hero!.hp).toBeGreaterThan(55)

    const paladin = setup('crimson-paladin')
    for (let i = 0; i < 3; i++) expect(paladin.registry.acquire(paladin.state, 'heroes:crimson-vow', hooks)).toBe(true)
    expect(paladin.adapter.mitigateIncomingDamage(100)).toBeCloseTo(78.5)
    paladin.state.hero!.hp = 20
    expect(paladin.adapter.modifyOutgoingDamage(20)).toBeCloseTo(31.2)
    paladin.adapter.activate()
    expect(paladin.adapter.snapshot().barrier).toBeGreaterThanOrEqual(90)
  })
  it('does not consume a barrier for damage ignored by legacy invulnerability', () => {
    const { state, adapter } = setup('crimson-paladin')
    adapter.activate()
    const initialBarrier = adapter.snapshot().barrier
    state.hero!.inv = 0.5
    expect(adapter.mitigateIncomingDamage(50)).toBe(50)
    expect(adapter.snapshot().barrier).toBe(initialBarrier)
    state.hero!.inv = 0
    expect(adapter.mitigateIncomingDamage(50)).toBeLessThan(50)
    expect(adapter.snapshot().barrier).toBeLessThan(initialBarrier)
  })

  describe('Crimson Retribution (barrier burst)', () => {
    const PALADIN = BALANCE.heroes.specialEffects['crimson-paladin']
    const bursts = () => vi.mocked(hooks.sfx).mock.calls.filter(([cue]) => cue === 'crimson-paladin-retribution').length
    const armed = () => {
      const ctx = setup('crimson-paladin')
      const hero = ctx.state.hero!
      const near = mob(hero.x + 60, hero.y, 900)
      const far = mob(hero.x + PALADIN.retributionRange + 60, hero.y, 900)
      ctx.state.mobs.push(near, far)
      expect(ctx.adapter.activate()).toBe(true)
      vi.mocked(hooks.sfx).mockClear()
      return { ...ctx, near, far }
    }

    it('detonates once when the barrier expires, dealing damage scaled by the absorbed amount', () => {
      const { adapter, near, far } = armed()
      const absorbed = 40 * (1 - PALADIN.baseReduction)
      expect(adapter.mitigateIncomingDamage(40)).toBe(0)
      adapter.tick(PALADIN.barrierSeconds - 0.5)
      expect(near.hp).toBe(900)
      expect(bursts()).toBe(0)
      adapter.tick(0.6)
      expect(900 - near.hp).toBeCloseTo(absorbed * PALADIN.retributionAbsorbRatio, 5)
      expect(far.hp).toBe(900)
      expect(bursts()).toBe(1)
      expect(adapter.snapshot()).toMatchObject({ barrier: 0, barrierSeconds: 0 })
      const after = near.hp
      adapter.tick(5)
      expect(near.hp).toBe(after)
      expect(bursts()).toBe(1)
    })

    it('detonates on the next tick once the barrier breaks, ending the ward early', () => {
      const { adapter, near } = armed()
      const capacity = adapter.snapshot().barrier
      expect(adapter.mitigateIncomingDamage(1000)).toBeGreaterThan(0)
      expect(adapter.snapshot().barrier).toBe(0)
      adapter.tick(0.016)
      expect(900 - near.hp).toBeCloseTo(capacity * PALADIN.retributionAbsorbRatio, 5)
      expect(bursts()).toBe(1)
      expect(adapter.snapshot().barrierSeconds).toBe(0)
    })

    it('strikes at most the configured number of nearest enemies and scales with mastery rank', () => {
      const plain = armed()
      const hero = plain.state.hero!
      plain.state.mobs.length = 0
      for (let i = 0; i < PALADIN.retributionTargets + 3; i++) plain.state.mobs.push(mob(hero.x + 20 + i * 10, hero.y, 900))
      plain.adapter.mitigateIncomingDamage(30)
      plain.adapter.tick(PALADIN.barrierSeconds)
      expect(plain.state.mobs.filter(m => m.hp < 900)).toHaveLength(PALADIN.retributionTargets)
      const base = 900 - plain.state.mobs[0]!.hp

      const ranked = armed()
      for (let i = 0; i < 3; i++) ranked.registry.acquire(ranked.state, 'heroes:crimson-vow', hooks)
      ranked.state.hero!.inv = 0
      // Same absorbed amount: feed the pre-mitigation hit that reduces to the same value.
      const reduction = PALADIN.baseReduction + Math.min(PALADIN.extraReductionCap, 3 * PALADIN.reductionPerRank)
      ranked.adapter.mitigateIncomingDamage(30 * (1 - PALADIN.baseReduction) / (1 - reduction))
      ranked.adapter.tick(PALADIN.barrierSeconds)
      expect(900 - ranked.near.hp).toBeCloseTo(base * (PALADIN.retributionAbsorbRatio + 3 * PALADIN.retributionRatioPerRank) / PALADIN.retributionAbsorbRatio, 5)
    })

    it('stays silent without enough absorbed damage, after death, or after reset', () => {
      const quiet = armed()
      quiet.adapter.tick(PALADIN.barrierSeconds + 0.1)
      expect(quiet.near.hp).toBe(900)
      expect(bursts()).toBe(0)

      const dead = armed()
      dead.adapter.mitigateIncomingDamage(40)
      dead.state.hero!.hp = 0
      dead.adapter.tick(PALADIN.barrierSeconds + 0.1)
      expect(dead.near.hp).toBe(900)

      const restarted = armed()
      restarted.adapter.mitigateIncomingDamage(40)
      restarted.adapter.reset()
      restarted.state.mobs.push(restarted.near)
      restarted.adapter.tick(PALADIN.barrierSeconds + 0.1)
      expect(restarted.adapter.activate()).toBe(true)
      restarted.adapter.tick(PALADIN.barrierSeconds + 0.1)
      expect(restarted.near.hp).toBe(900)
      expect(bursts()).toBe(0)
    })

    it('keeps burst numbers finite, bounded and centralized in heroes.json', () => {
      expect(PALADIN.retributionMinAbsorb).toBeGreaterThan(0)
      expect(PALADIN.retributionRange).toBeGreaterThan(PALADIN.counterRange)
      expect(Number.isInteger(PALADIN.retributionTargets)).toBe(true)
      expect(PALADIN.retributionTargets).toBeGreaterThan(PALADIN.counterTargets)
      expect(PALADIN.retributionTargets).toBeLessThanOrEqual(8)
      // The absorbed amount can never exceed the barrier, so the burst is bounded by it (level 30 = late run).
      const maxBarrier = PALADIN.barrierBase + 30 * PALADIN.barrierPerHeroLevel + 3 * PALADIN.barrierPerRank
      const maxHit = maxBarrier * (PALADIN.retributionAbsorbRatio + 3 * PALADIN.retributionRatioPerRank)
      expect(Number.isFinite(maxHit)).toBe(true)
      expect(maxHit).toBeLessThan(400)
    })
  })

  it('preserves the original three hero constructors and rejects invalid damage inputs', () => {
    const original = (['knight', 'ranger', 'wizard'] as const).map(id => createHero(id))
    setup('shadowblade')
    expect((['knight', 'ranger', 'wizard'] as const).map(id => createHero(id))).toEqual(original)
    const { adapter } = setup('crimson-paladin')
    expect(adapter.mitigateIncomingDamage(NaN)).toBe(0)
    expect(adapter.modifyOutgoingDamage(Infinity)).toBe(0)
    expect(adapter.mitigateIncomingDamage(-10)).toBe(0)
  })

  it('records the struck enemy positions of a cast for the VFX and nothing for the barrier', () => {
    for (const id of ['shadowblade', 'spirit-summoner'] as const) {
      const { state, adapter } = setup(id)
      const hero = state.hero!
      state.mobs.push(mob(hero.x + 40, hero.y), mob(hero.x - 70, hero.y + 30), mob(hero.x, hero.y - 100),
        mob(hero.x + 120, hero.y + 2), mob(hero.x + 9000, hero.y))
      expect(adapter.castTargets()).toEqual([])
      expect(adapter.activate()).toBe(true)
      const targets = adapter.castTargets()
      expect(targets).toHaveLength(3)
      expect(targets[0]).toEqual({ x: hero.x + 40, y: hero.y })
      expect(targets.every(t => Math.hypot(t.x - hero.x, t.y - hero.y) < 1000)).toBe(true)
      expect(Object.isFrozen(targets)).toBe(true)
      adapter.reset()
      expect(adapter.castTargets()).toEqual([])
    }
    const paladin = setup('crimson-paladin')
    paladin.state.mobs.push(mob(paladin.state.hero!.x + 30, paladin.state.hero!.y))
    expect(paladin.adapter.activate()).toBe(true)
    expect(paladin.adapter.castTargets()).toEqual([])
  })

  it.each(['shadowblade', 'spirit-summoner', 'crimson-paladin'] as const)(
    '%s leaves the cast visuals to the dedicated hero VFX instead of legacy impact rings',
    id => {
      const { state, adapter } = setup(id)
      const waves = state.impactWaves.length, sparks = state.fx.length
      expect(adapter.activate()).toBe(true)
      expect(state.impactWaves).toHaveLength(waves)
      expect(state.fx).toHaveLength(sparks)
    },
  )

  it('reset clears per-run timers, companion state, barrier and content upgrades', () => {
    const { state, registry, adapter } = setup('crimson-paladin')
    registry.acquire(state, HERO_DEFINITIONS['crimson-paladin'].progressionAbility, hooks)
    adapter.activate()
    adapter.tick(1)
    resetRun(state)
    adapter.reset()
    expect(adapter.snapshot().cooldown).toBe(0)
    expect(adapter.snapshot().barrier).toBe(0)
    expect(state.content.levels).toEqual({ [HERO_DEFINITIONS['crimson-paladin'].startingAbility]: 1 })
    expect(state.hero?.hp).toBe(HERO_DEFINITIONS['crimson-paladin'].stats.hp)
  })

  it('does not tick while paused or on invalid dt, and isolates per-instance cooldowns', () => {
    const first = setup('shadowblade')
    const second = setup('shadowblade')
    first.adapter.activate()
    first.state.mode = 'paused'
    const remaining = first.adapter.snapshot().cooldown
    first.adapter.tick(3)
    first.adapter.tick(NaN)
    expect(first.adapter.snapshot().cooldown).toBe(remaining)
    expect(second.adapter.snapshot().cooldown).toBe(0)
    first.state.mode = 'play'
    first.adapter.tick(2)
    expect(first.adapter.snapshot().cooldown).toBeLessThan(remaining)
  })
})

it('executes Hall phantom only when Shadowblade Q stealth ends and never while paused', () => {
  const baseline = setup('shadowblade')
  const improved = setup('shadowblade')
  improved.state.heroId = 'shadowblade'
  installHallRun(improved.state, { hero:'shadowblade', ranks:{'shadowblade-phantom':1} })
  for (const {state,adapter} of [baseline,improved]) {
    state.mobs.push(mob(35,0,10000))
    expect(adapter.activate()).toBe(true)
  }
  expect(improved.state.mobs[0]!.hp).toBe(baseline.state.mobs[0]!.hp)
  const before=improved.state.mobs[0]!.hp
  improved.state.mode='paused'
  improved.adapter.tick(10)
  expect(improved.state.mobs[0]!.hp).toBe(before)
  improved.state.mode='play'
  improved.state.time=1
  improved.adapter.tick(1)
  expect(before-improved.state.mobs[0]!.hp).toBeCloseTo(improved.state.hero!.damage*hallTuning.shadowPhantomDamage)
  const after=improved.state.mobs[0]!.hp
  improved.adapter.tick(1)
  expect(improved.state.mobs[0]!.hp).toBe(after)
})
