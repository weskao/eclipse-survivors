import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { shallowReactive } from 'vue'
import ContentShowcase from './ContentShowcase.vue'
import { createContentRegistry } from '../game/content/registry'
import type { ContentPack } from '../game/content/contracts'
import { createHero, createState } from '../game/state'
import type { Engine } from '../game/engine'
import type { GameHooks } from '../game/types'

const hooks: GameHooks = { sfx() {}, message() {}, offerUpgrades() {}, end() {} }
const pack: ContentPack = { id: 'arcane', abilities: [{
  id: 'arcane:blast', kind: 'weapon', icon: '✦', title: 'Arcane Blast',
  desc: 'Developer-preview skill', maxLevel: 1, rarity: 'rare',
}] }

describe('development content showcase', () => {
  it('immediately refreshes displayed levels and disables capped grants after a click', async () => {
    const state = createState()
    state.hero = createHero('knight')
    const registry = createContentRegistry([pack])
    const engine = {
      state, contentRegistry: registry, ui: shallowReactive({ mode: 'play' }),
      showcaseGrant(id: 'arcane:blast') { return registry.acquire(state, id, hooks) },
      showcaseEmit() {},
    } as unknown as Engine
    const wrapper = mount(ContentShowcase, { props: { engine } })
    const button = wrapper.find('[aria-label="Grant Arcane Blast"]')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    expect(state.content.levels['arcane:blast']).toBe(1)
    expect(button.text()).toContain('1/1')
    expect(button.attributes('disabled')).toBeDefined()
  })
})
