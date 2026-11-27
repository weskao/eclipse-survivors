import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type Component } from 'vue'
import Es2ChoiceDialog from './Es2ChoiceDialog.vue'
import Es2Dialog from './Es2Dialog.vue'
import { CHOICE_ARM_MS, type MenuChoice } from './model'
import { setLocale } from '../../../i18n'
import { heroMasteryPreview } from '../../../game/content/heroes/mastery-preview'

const choices: MenuChoice[] = [
  { id: 'bolt', title: '閃電術', rarity: 'common', icon: '✦', level: 1, maxLevel: 5 },
  { id: 'frost', title: '冰霜結界', rarity: 'rare', requirements: '霜印 Lv.2', imageSrc: '/assets/frost.webp' },
  { id: 'evolution', title: '究極覺醒', rarity: 'legendary', evolution: true, disabled: true },
]
const dialog = () => document.querySelector<HTMLElement>('.es2-dialog')!
const button = (id: string) => document.querySelector<HTMLButtonElement>(`[data-choice="${id}"]`)!
const press = (key: string, extra: KeyboardEventInit = {}) => document.dispatchEvent(new KeyboardEvent('keydown', {
  key, code: /^[0-9]$/.test(key) ? `Digit${key}` : '', bubbles: true, cancelable: true, ...extra,
}))
const wrappers: VueWrapper[] = []
function mounted(component: Component, props: Record<string, unknown>) {
  const wrapper = mount(component, { attachTo: document.body, props })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount(); document.body.innerHTML = '' })

describe('ES2 upgrade and reward picker', () => {
  it('ignores a tap that starts right after the picker opens mid-combat, then accepts a deliberate tap', async () => {
    let now = 1000
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now)
    try {
      const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
      await nextTick()
      const tap = (id: string) => {
        const card = button(id)
        card.dispatchEvent(new Event('pointerdown', { bubbles: true }))
        card.click()
      }
      now += CHOICE_ARM_MS - 1 // thumb was heading for dash/joystick when the cards appeared
      tap('bolt')
      expect(wrapper.emitted('choose')).toBeUndefined()
      expect(button('bolt').disabled).toBe(false) // never disabled: focus and keyboard stay usable
      now += 1
      tap('bolt')
      expect(wrapper.emitted('choose')).toEqual([['bolt']])
      // Chained level-ups show a fresh set of cards, which re-arms the guard.
      await wrapper.setProps({ items: choices.slice(1, 2) })
      await nextTick()
      tap('frost')
      expect(wrapper.emitted('choose')).toHaveLength(1)
      now += CHOICE_ARM_MS
      tap('frost')
      expect(wrapper.emitted('choose')).toEqual([['bolt'], ['frost']])
    } finally {
      clock.mockRestore()
    }
  })

  it('renders real mastery comparisons on the mastery card only', async () => {
    const mastery: MenuChoice = {
      id: 'heroes:shadow-precision', title: '影刃行者 · 專精', rarity: 'rare', level: 0, maxLevel: 3,
      statChanges: heroMasteryPreview('heroes:shadow-precision', 0, 3),
    }
    mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: [mastery, ...choices.slice(0, 2)] })
    await nextTick()
    const stats = button(mastery.id).querySelectorAll('.es2-mastery-stat')
    expect(stats).toHaveLength(2)
    // Before, arrow and after are separate elements, so compare each part, not joined text.
    const values = (stat?: Element) => ['.es2-mastery-before', '.es2-mastery-arrow', '.es2-mastery-after']
      .map(selector => stat?.querySelector(selector)?.textContent)
    expect(values(stats[0])).toEqual(['170%', '→', '188%'])
    expect(values(stats[1])).toEqual(['140%', '→', '144.5%'])
    expect(button('bolt').querySelector('.es2-mastery-stats')).toBeNull()
  })

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

  it.each(['level', 'evolution', 'treasure'] as const)('does not navigate %s choices with arrow keys', async (kind) => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind, items: choices })
    await nextTick(); await nextTick()
    button('bolt').focus()
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      button('bolt').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
      await nextTick()
      expect(document.activeElement).toBe(button('bolt'))
      expect(wrapper.emitted('choose')).toBeUndefined()
    }
    press('2')
    expect(wrapper.emitted('choose')).toEqual([['frost']])
  })

  it.each(['level', 'evolution', 'treasure'] as const)(
    'suppresses Space and Enter on focused %s choice buttons without blocking clicks', async (kind) => {
      const wrapper = mounted(Es2ChoiceDialog, { active: true, kind, items: choices })
      await nextTick()
      const card = button('bolt')
      card.focus()
      for (const [key, code] of [[' ', 'Space'], ['Enter', 'Enter'], ['Enter', 'NumpadEnter']]) {
        for (const type of ['keydown', 'keyup'] as const) {
          const event = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })
          card.dispatchEvent(event)
          expect(event.defaultPrevented, `${type} ${code}`).toBe(true)
        }
      }
      expect(wrapper.emitted('choose')).toBeUndefined()
      card.click()
      expect(wrapper.emitted('choose')).toEqual([['bolt']])
    },
  )

  it('does not interfere with Space/Enter after the choice dialog closes', async () => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
    await nextTick()
    await wrapper.setProps({ active: false })
    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true })
    document.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('uses physical number positions across IMEs and the separate numpad', async () => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
    await nextTick()
    press('2', { code: 'KeyQ' }) // A character that looks numeric is not the Digit2 position.
    expect(wrapper.emitted('choose')).toBeUndefined()
    press('End', { code: 'Numpad2' }) // NumLock off.
    expect(wrapper.emitted('choose')).toEqual([['frost']])
    await wrapper.setProps({ active: false })
    await wrapper.setProps({ active: true })
    await nextTick()
    press('Process', { code: 'Digit1', isComposing: true }) // Non-English IME.
    expect(wrapper.emitted('choose')).toEqual([['frost'], ['bolt']])
  })

  it.each(['level', 'evolution', 'treasure'] as const)('blocks non-numeric keys on %s choices', async (kind) => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind, items: choices })
    await nextTick(); await nextTick()
    const card = button('bolt')
    card.focus()
    const background = vi.fn()
    window.addEventListener('keydown', background)
    try {
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Escape', 'Home', 'End', 'PageUp', 'PageDown', 'w', 'q', 'p', '0']) {
        const code = key === '0' ? 'Digit0' : key.length === 1 ? `Key${key.toUpperCase()}` : key
        for (const type of ['keydown', 'keyup'] as const) {
          const event = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })
          card.dispatchEvent(event)
          expect(event.defaultPrevented, `${type} ${key}`).toBe(true)
        }
        expect(document.activeElement).toBe(card)
      }
      expect(background).not.toHaveBeenCalled()
      expect(wrapper.emitted('choose')).toBeUndefined()
      expect(wrapper.emitted('cancel')).toBeUndefined()
      expect(wrapper.emitted('settings')).toBeUndefined()
      press('2')
      expect(wrapper.emitted('choose')).toEqual([['frost']])
    } finally {
      window.removeEventListener('keydown', background)
    }
  })

  it('allows key releases to clear held gameplay controls without activating the choice', async () => {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
    await nextTick()
    const release = vi.fn()
    window.addEventListener('keyup', release)
    try {
      const event = new KeyboardEvent('keyup', { key: 'w', code: 'KeyW', bubbles: true, cancelable: true })
      button('bolt').dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect(release).toHaveBeenCalledWith(event)
      expect(wrapper.emitted('choose')).toBeUndefined()
    } finally {
      window.removeEventListener('keyup', release)
    }
  })

  it('restores focus when the choice dialog closes through its pointer controls', async () => {
    const launch = document.createElement('button'); launch.textContent = 'launch'; document.body.append(launch); launch.focus()
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'treasure', items: choices })
    await nextTick(); await nextTick()
    expect(dialog().contains(document.activeElement)).toBe(true)
    dialog().querySelector<HTMLButtonElement>('.es2-close')!.click()
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
  it('ignores horizontal arrows for dialog shortcuts without blocking editable controls', async () => {
    const wrapper = mounted(Es2Dialog, { active: true, title: 'Confirm', dismissible: true })
    await nextTick()
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      document.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
    expect(wrapper.emitted('shortcut')).toBeUndefined()
    const slider = document.createElement('input')
    slider.type = 'range'
    dialog().append(slider)
    slider.focus()
    const adjustable = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    slider.dispatchEvent(adjustable)
    expect(adjustable.defaultPrevented).toBe(false)
  })

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

it('reveals treasure rarity without delaying or duplicating the claim, and supports skipping', async () => {
  const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'treasure', items: [
    { id: 'cursed', title: 'Cursed relic', rarity: 'legendary', cursed: true },
    { id: 'epic', title: 'Epic relic', rarity: 'epic' },
  ] })
  await nextTick()
  expect(dialog().querySelector('[data-es3-reveal="treasure"]')).not.toBeNull()
  expect(button('cursed').querySelector('[data-es3-cursed]')).not.toBeNull()
  dialog().querySelector<HTMLButtonElement>('[data-es3-skip-reveal]')!.click()
  await nextTick()
  expect(dialog().querySelector('[data-es3-reveal]')).toBeNull()
  expect(wrapper.emitted('choose')).toBeUndefined()
  button('epic').click()
  button('epic').click()
  expect(wrapper.emitted('choose')).toEqual([['epic']])
})

it('opens the tier chest above the shared card grid and skips it through a hint-row checkbox', async () => {
  const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices })
  await nextTick()
  const bodyShape = () => Array.from(dialog().querySelector('.es2-selection-scene')!.children).map(el => el.className)
  const level = bodyShape()
  expect(level).toEqual(['es2-choice-grid'])
  expect(dialog().querySelector('.es2-dialog-actions > .es2-hint .es2-hint-text')).not.toBeNull()
  expect(dialog().querySelector('[data-es3-skip-reveal]')).toBeNull()
  await wrapper.setProps({ kind: 'treasure', tier: 'legendary' })
  await nextTick()
  expect(bodyShape()).toEqual(['es3-chest-open', ...level])
  const chest = dialog().querySelector<HTMLImageElement>('[data-es3-chest-reveal]')!
  expect(chest.closest('.es3-chest-open')?.getAttribute('data-tier')).toBe('legendary')
  expect(chest.getAttribute('src')).toContain('treasure-legendary')
  expect(chest.closest('[aria-hidden="true"]')).not.toBeNull()
  expect(dialog().querySelectorAll('.es2-choice-grid > .es2-choice')).toHaveLength(choices.length)
  expect(dialog().querySelector('.es2-dialog-header [data-es3-skip-reveal]')).toBeNull()
  const skip = dialog().querySelector<HTMLButtonElement>('.es2-dialog-actions > .es2-hint [data-es3-skip-reveal][role="checkbox"]')!
  expect(skip.getAttribute('aria-checked')).toBe('false')
  expect(skip.textContent).toContain('跳過揭曉動畫')
  skip.click()
  await nextTick()
  expect(skip.getAttribute('aria-checked')).toBe('true')
  expect(wrapper.emitted('skipReveal')).toEqual([[true]])
  expect(bodyShape()).toEqual(level)
  expect(dialog().querySelector('[data-es3-reveal]')).toBeNull()
  expect(wrapper.emitted('choose')).toBeUndefined()
})

it('remembers a checked skip: no chest on open, and unchecking never replays the current reveal', async () => {
  const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'treasure', tier: 'rare', skipReveal: true,
    items: [{ id: 'reward', title: 'Reward', rarity: 'rare' }] })
  await nextTick()
  expect(dialog().querySelector('[data-es3-chest-reveal]')).toBeNull()
  expect(dialog().querySelector('[data-es3-reveal]')).toBeNull()
  const skip = dialog().querySelector<HTMLButtonElement>('[data-es3-skip-reveal]')!
  expect(skip.getAttribute('aria-checked')).toBe('true')
  skip.click()
  await wrapper.setProps({ skipReveal: false })
  expect(wrapper.emitted('skipReveal')).toEqual([[false]])
  expect(skip.getAttribute('aria-checked')).toBe('false')
  expect(dialog().querySelector('[data-es3-chest-reveal]')).toBeNull()
  await wrapper.setProps({ active: false })
  await wrapper.setProps({ active: true })
  await nextTick()
  expect(dialog().querySelector('[data-es3-chest-reveal]')).not.toBeNull()
})

it.each(['rare', 'epic', 'legendary'] as const)('keeps %s reward rarity on the opened chest and permits a single claim after skip', async tier => {
  const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'treasure', tier,
    items: [{ id: 'reward', title: 'Reward', rarity: tier }] })
  await nextTick()
  expect(button('reward').classList.contains('es2-rarity-' + tier)).toBe(true)
  expect(dialog().querySelector('.es2-selection-scene')?.getAttribute('data-tier')).toBe(tier)
  expect(dialog().querySelector('.es3-chest-open')?.getAttribute('data-tier')).toBe(tier)
  dialog().querySelector<HTMLButtonElement>('[data-es3-skip-reveal]')!.click()
  await nextTick()
  expect(dialog().querySelector('[data-es3-reveal]')).toBeNull()
  expect(dialog().querySelector('[data-es3-chest-reveal]')).toBeNull()
  button('reward').click()
  button('reward').click()
  expect(wrapper.emitted('choose')).toEqual([['reward']])
})

it.each([false, true])('keeps the same isolated treasure and evolution footer (still=%s) across dialog changes and locales', async still => {
  const storage = { getItem: () => null, setItem: () => {} }
  const footer = () => dialog().querySelector<HTMLElement>('.es2-dialog-actions > .es2-hint')!
  const skip = () => footer().querySelector<HTMLButtonElement>('[data-es3-skip-reveal]')!
  setLocale('zh-TW', storage)
  try {
    const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'level', items: choices, still, skipReveal: true })
    await nextTick()
    expect(footer().textContent).toContain('點選卡牌或按 1–9 選擇')
    expect(skip()).toBeNull()
    await wrapper.setProps({ kind: 'treasure', tier: 'rare' })
    expect(footer().children).toHaveLength(2)
    expect(footer().firstElementChild?.textContent).toBe('點選卡牌或按 1–9 選擇')
    expect(footer().lastElementChild).toBe(skip())
    expect(skip().getAttribute('aria-checked')).toBe('true')
    expect(skip().textContent?.trim()).toBe('跳過揭曉動畫')
    expect(dialog().querySelector('[data-es3-reveal]')).toBeNull()
    setLocale('en', storage)
    await nextTick()
    expect(footer().firstElementChild?.textContent).toBe('Click a card or press 1–9 to select')
    expect(skip().textContent?.trim()).toBe('Skip Reveal')
    skip().click()
    await nextTick()
    expect(skip().getAttribute('aria-checked')).toBe('false')
    expect(wrapper.emitted('skipReveal')).toEqual([[false]])
    expect(dialog().querySelector('[data-es3-reveal]')).toBeNull()
    await wrapper.setProps({ items: [] })
    expect(footer().textContent?.trim()).toBe('Skip Reveal')
    expect(dialog().querySelector('.es2-dialog-header p')?.textContent).toBe('No options available')
    await wrapper.setProps({ items: choices, kind: 'treasure', skipReveal: true })
    const treasureFooter = footer().innerHTML
    await wrapper.setProps({ kind: 'evolution' })
    expect(footer().innerHTML).toBe(treasureFooter)
    expect(footer().children).toHaveLength(2)
    expect(footer().firstElementChild?.textContent).toBe('Click a card or press 1–9 to select')
    expect(footer().lastElementChild).toBe(skip())
    expect(dialog().querySelector('.es2-dialog-body [data-es3-skip-reveal]')).toBeNull()
    expect(dialog().querySelector('[data-es3-reveal]')).toBeNull()
    await wrapper.setProps({ items: [] })
    expect(footer().textContent?.trim()).toBe('Skip Reveal')
    expect(dialog().querySelector('.es2-dialog-header p')?.textContent).toBe('No options available')
    await wrapper.setProps({ kind: 'level', items: choices })
    expect(footer().textContent?.trim()).toBe('Click a card or press 1–9 to select')
    expect(skip()).toBeNull()
  } finally {
    setLocale('zh-TW', storage)
  }
})

it('places the localized evolution selection hint immediately before its checkbox and preserves the ordinary upgrade hint', async () => {
  const wrapper = mounted(Es2ChoiceDialog, { active: true, kind: 'evolution', items: choices })
  await nextTick()
  const hint = dialog().querySelector('.es2-dialog-actions .es2-hint-text')!
  expect(hint.textContent).toBe('點選卡牌或按 1–9 選擇')
  expect(hint.nextElementSibling).toBe(dialog().querySelector('.es2-dialog-actions [data-es3-skip-reveal]'))
  await wrapper.setProps({ kind: 'level' })
  expect(dialog().querySelector('.es2-hint-text')).not.toBeNull()
  expect(dialog().querySelector('[data-es3-skip-reveal]')).toBeNull()
})
