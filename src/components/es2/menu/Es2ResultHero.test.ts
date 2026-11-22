import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ART_URLS } from '../../../game/art'
import { PRODUCTION_HERO_SOURCES } from '../../../game/render/es2/production-heroes'
import type { RunStats } from '../../../meta/types'
import Es2Result from './Es2Result.vue'

const base = {
  id: 'run_test_001', mode: 'quick', hero: 'knight', victory: true, seconds: 90, kills: 3, level: 2,
  remainingHp: 10, damageDealt: 100, damageTaken: 20,
} as unknown as RunStats

describe('result screen hero portrait', () => {
  it('shows the specialization hero, not its legacy base class art', () => {
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '勝利', summary: '', result: { ...base, specializationId: 'crimson-paladin' } },
      attachTo: document.body,
    })
    const html = document.body.querySelector('.es2-result-hero')!.innerHTML
    expect(html).toContain(PRODUCTION_HERO_SOURCES['crimson-paladin'])
    expect(html).not.toContain(ART_URLS.knight)
    wrapper.unmount()
  })

  it('keeps the original hero art for legacy runs', () => {
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '勝利', summary: '', result: base }, attachTo: document.body,
    })
    expect(document.body.querySelector('.es2-result-hero')!.innerHTML).toContain(ART_URLS.knight)
    wrapper.unmount()
  })
})
