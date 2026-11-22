import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ART_URLS } from '../../../game/art'
import { HERO_DEFINITIONS } from '../../../game/content/heroes'
import type { RunStats } from '../../../meta/types'
import Es2Result from './Es2Result.vue'

const base = {
  id: 'run_test_001', mode: 'quick', hero: 'knight', victory: true, seconds: 90, kills: 3, level: 2,
  remainingHp: 10, damageDealt: 100, damageTaken: 20,
} as unknown as RunStats

afterEach(() => { document.body.innerHTML = '' })

describe('result screen hero portrait', () => {
  it('shows the specialization hero, not its legacy base class art', () => {
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '勝利', summary: '', result: { ...base, specializationId: 'crimson-paladin' } },
      attachTo: document.body,
    })
    const portrait = document.body.querySelector('.es2-result-hero img')
    expect(portrait?.getAttribute('src')).toBe(HERO_DEFINITIONS['crimson-paladin'].portraitSrc)
    expect(portrait?.getAttribute('src')).not.toBe(ART_URLS.knight)
    wrapper.unmount()
  })

  it('keeps the original hero art for legacy runs', () => {
    const wrapper = mount(Es2Result, {
      props: { active: true, ending: '勝利', summary: '', result: base }, attachTo: document.body,
    })
    expect(document.body.querySelector('.es2-result-hero img')?.getAttribute('src')).toBe(ART_URLS.knight)
    wrapper.unmount()
  })
})
