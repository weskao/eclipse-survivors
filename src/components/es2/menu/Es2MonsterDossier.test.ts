import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { BALANCE } from '../../../game/config'
import { BOSS_DEFINITIONS } from '../../../game/content/bosses/definitions'
import Es2CardDetails from './Es2CardDetails.vue'
import { monsterGroups } from './monster-details'
import type { MonsterId } from '../../../game/monster-catalog'

let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.unstubAllGlobals(); document.body.innerHTML = '' })

function setup(hover: boolean, id: MonsterId) {
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: hover }))
  wrapper = mount(Es2CardDetails, {
    attachTo: document.body,
    props: { entries: { [id]: { title: id, description: 'Description', groups: monsterGroups(id) } } },
    slots: { default: ({ open }: { open: (key: string) => void }) => h('article', { 'data-es2-context-card': id, tabindex: 0 },
      [h('button', { onClick: () => open(id) }, 'Info')]) },
  })
  return wrapper
}
describe('shared monster dossiers', () => {
  it('shows actual stats and the same skill rows on mouse hover and info-button dialog', async () => {
    const board = setup(true, 'slime')
    await board.get('article').trigger('pointerover', { pointerType: 'mouse' })
    const tooltip = document.querySelector('[role="tooltip"]')!
    expect(tooltip.querySelector('[data-monster-stat="ATK"]')?.textContent).toContain(String(BALANCE.enemies.baseDamage))
    expect(tooltip.querySelector('[data-monster-skill="pounce"] .es2-active-summary__icon')).not.toBeNull()
    const content = tooltip.querySelector('[data-monster-group="slime"]')?.textContent
    await board.get('button').trigger('click')
    await nextTick()
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.querySelector('[data-monster-group="slime"]')?.textContent).toBe(content)
  })

  it.each(Object.values(BOSS_DEFINITIONS))('opens the discovered boss $id on touch', async boss => {
    const board = setup(false, boss.id)
    await board.get('article').trigger('pointerover', { pointerType: 'touch' })
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
    await board.get('button').trigger('click')
    await nextTick()
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.querySelectorAll('[data-monster-group]')).toHaveLength(1)
    {
      const section = dialog.querySelector('[data-monster-group="' + boss.id + '"]')!
      expect(section.querySelector('[data-monster-stat="HP"]')?.textContent).toContain(String(boss.health))
      for (const attack of new Set(boss.phases.flat())) {
        expect(section.querySelector('[data-monster-skill="' + attack + '"] img')).not.toBeNull()
      }
    }
  })

  it('assigns a distinct authored icon to every expanded boss attack', () => {
    const skills = Object.values(BOSS_DEFINITIONS).flatMap(boss => monsterGroups(boss.id)).flatMap(group => group.skills)
    expect(skills).toHaveLength(new Set(skills.map(skill => skill.id)).size)
    expect(new Set(skills.map(skill => skill.icon)).size).toBe(skills.length)
    expect(skills.every(skill => !!skill.icon && !skill.icon.includes('/skill-icons/'))).toBe(true)
  })
})
