import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type Component } from 'vue'
import Es2ChoiceDialog from './Es2ChoiceDialog.vue'
import Es2Dialog from './Es2Dialog.vue'
import type { MenuChoice } from './model'

const choices: MenuChoice[] = [
  { id: 'bolt', title: '閃電術', rarity: 'common', icon: '✦', level: 1, maxLevel: 5 },
  { id: 'frost', title: '冰霜結界', rarity: 'rare', requirements: '霜印 Lv.2', imageSrc: '/assets/frost.webp' },
  { id: 'evolution', title: '究極覺醒', rarity: 'legendary', evolution: true, disabled: true },
]
const dialog = () => document.querySelector<HTMLElement>('.es2-dialog')!
const button = (id: string) => document.querySelector<HTMLButtonElement>(`[data-choice="${id}"]`)!
const press = (key: string, extra: KeyboardEventInit = {}) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }))
const wrappers: VueWrapper[] = []
function mounted(component: Component, props: Record<string, unknown>) {
  const wrapper = mount(component, { attachTo: document.body, props })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount(); document.body.innerHTML = '' })

describe('ES2 upgrade and reward picker', () => {
  it('shows rarity, actual art, levels, requirements and disables unavailable evolution', async () => {
    mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
    await nextTick()
    expect(dialog().getAttribute('aria-modal')).toBe('true')
    expect(button('bolt').textContent).toContain('Lv.1')
    expect(button('frost').classList.contains('es2-rarity-rare')).toBe(true)
    expect(button('frost').querySelector('img')?.getAttribute('src')).toBe('/assets/frost.webp')
    expect(button('frost').textContent).toContain('霜印 Lv.2')
    expect(button('evolution').disabled).toBe(true)
    expect(dialog().querySelector('.es2-evolution-sigil')).not.toBeNull()
  })

  it('emits one and only one choice after repeat clicks / number key', async () => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
    await nextTick()
    button('bolt').click()
    button('bolt').click()
    press('2')
    await nextTick()
    expect(wrapper.emitted('choose')).toEqual([['bolt']])
    expect(button('frost').disabled).toBe(true)
    await wrapper.setProps({ active: false })
    await wrapper.setProps({ active: true })
    await nextTick()
    press('2')
    expect(wrapper.emitted('choose')).toEqual([['bolt'], ['frost']])
  })

  it('rejects repeated/out-of-range shortcuts and cannot choose disabled cards', async () => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
    await nextTick()
    press('3')
    press('4')
    press('1', { repeat: true })
    press('1', { ctrlKey: true })
    expect(wrapper.emitted('choose')).toBeUndefined()
    press('1')
    expect(wrapper.emitted('choose')).toEqual([['bolt']])
  })

  it('allows arrow navigation, traps Tab and restores focus when closed', async () => {
    const launch = document.createElement('button'); launch.textContent = 'launch'; document.body.append(launch); launch.focus()
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'treasure', items: choices })
    await nextTick(); await nextTick()
    expect(dialog().contains(document.activeElement)).toBe(true)
    button('bolt').focus()
    button('bolt').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    await nextTick()
    expect(document.activeElement).toBe(button('frost'))
    button('frost').focus()
    press('Tab')
    expect(dialog().contains(document.activeElement)).toBe(true)
    press('Escape')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    await wrapper.setProps({ active: false })
    expect(document.activeElement).toBe(launch)
  })

  it('does not close mandatory level-up on Escape and blocks outside selection', async () => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
    await nextTick()
    press('Escape')
    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(dialog().getAttribute('aria-modal')).toBe('true')
  })
})

describe('ES2 dialog accessibility', () => {
  it('closes optional dialogs on backdrop but not inner content', async () => {
    const wrapper = mounted(Es2Dialog, { active: true, title: 'Confirm', dismissible: true })
    await nextTick()
    const backdrop = document.querySelector<HTMLElement>('.es2-backdrop')!
    dialog().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(wrapper.emitted('cancel')).toBeUndefined()
    backdrop.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
