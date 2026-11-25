import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { emptyProfile } from '../../../meta/profile'
import type { RunStats } from '../../../meta/types'
import { UP } from '../../../game/constants'
import Es2MenuSystem from './Es2MenuSystem.vue'
import { WORLD_ART } from '../../../game/render/es2/production-world'

const base = {
  screen: 'menu' as const, choice: 'knight' as const, runMode: 'quick' as const,
  version: '1.1.0', profile: emptyProfile(), upgrades: UP.slice(0, 3),
  upgradeEffect: 'still' as const, cameraShake: false, settingsOpen: false,
}
const wrappers: VueWrapper[] = []
const find = (selector: string) => document.querySelector<HTMLElement>(selector)!
const click = (selector: string) => find(selector).click()
const press = (key: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key, code: /^[1-9]$/.test(key) ? `Digit${key}` : key, bubbles: true, cancelable: true }))
function mounted(props: Record<string, unknown> = {}) {
  const wrapper = mount(Es2MenuSystem, { attachTo: document.body, props: { ...base, ...props } })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount(); document.body.innerHTML = '' })

describe('ES2 main menu integration adapter', () => {
  it('keeps legacy hero, mode and start action names with original artwork', async () => {
    const wrapper = mounted()
    click('[data-hero="ranger"]')
    click('[data-mode="challenge"]')
    click('.es2-start')
    expect(wrapper.emitted('select')).toEqual([['ranger']])
    expect(wrapper.emitted('mode')).toEqual([['challenge']])
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(find('[data-hero="knight"] img').getAttribute('src')).toBeTruthy()
  })

  it('opens progression, spends nothing without funds, and confirms reset safely', async () => {
    const wrapper = mounted()
    click('.es2-hall-links button')
    await nextTick()
    expect(find('.es2-dialog')?.textContent).toContain('永久強化')
    const buy = find('.es2-archive-card .es2-secondary') as HTMLButtonElement
    expect(buy.disabled).toBe(true)
    click('.es2-danger')
    await nextTick()
    expect(find('.es2-dialog')?.textContent).toContain('重置所有遠征紀錄')
    click('.es2-dialog-actions .es2-secondary')
    await nextTick()
    expect(wrapper.emitted('reset')).toBeUndefined()
    click('.es2-danger')
    await nextTick()
    click('.es2-danger-filled')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('shows both victory and defeat results with correct actions', async () => {
    const completed: RunStats = {
      id: 'r1', mode: 'quick', hero: 'knight', victory: true,
      seconds: 154, kills: 92, level: 14, damageDealt: 1200, damageTaken: 90,
      remainingHp: 20, bossDefeated: true, enemies: {}, abilities: [],
    }
    const wrapper = mounted({ screen: 'result', ending: '勝利', summary: '黎明再臨', runResult: completed })
    await nextTick()
    expect(find('.es2-dialog').classList.contains('es2-tone-victory')).toBe(true)
    expect(find('.es2-result')?.textContent).toContain('02:34')
    click('.es2-dialog-actions .es2-primary')
    expect(wrapper.emitted('again')).toHaveLength(1)
    expect(wrapper.props('runResult')).toBeDefined()
    await wrapper.setProps({ runResult: { ...completed, victory: false }, ending: '落敗' })
    expect(find('.es2-dialog').classList.contains('es2-tone-defeat')).toBe(true)
    click('.es2-dialog-actions .es2-secondary')
    expect(wrapper.emitted('home')).toHaveLength(1)
  })

  it('renders ordinary, weapon and hero upgrades with the same before/after emphasis', async () => {
    mounted({ screen: 'level', upgrades: [
      { ...UP[0]!, level: 1 },
      { id: 'weapons:shadow-daggers', title: 'Shadow Daggers', desc: '', icon: '✦', rarity: 'common', level: 1, maxLevel: 5 },
      { id: 'heroes:shadow-precision', title: 'Shadow Precision', desc: '', icon: '✦', rarity: 'rare', level: 0, maxLevel: 3 },
    ] })
    await nextTick()
    for (const [id, expected] of [
      ['damage', '163.84%'], ['weapons:shadow-daggers', '65%'], ['heroes:shadow-precision', '188%'],
    ]) {
      const card = find('[data-choice="' + id + '"]')
      const values = card.querySelector('.es2-mastery-values')
      expect(values?.textContent).toContain('→')
      expect(values?.querySelector('strong')?.textContent).toBe(expected)
    }
  })

  it('forwards both legacy level-up and independently supplied treasure choices', async () => {
    const wrapper = mounted({ screen: 'level' })
    await nextTick()
    press('1')
    expect(wrapper.emitted('choose')).toEqual([[UP[0]!.id]])
    await wrapper.setProps({ screen: 'hidden', specialChoice: { kind: 'treasure', items: [{ id: 'relic:moon', title: '月之聖物' }] } })
    await nextTick()
    click('[data-choice="relic:moon"]')
    expect(wrapper.emitted('specialChoose')).toEqual([['relic:moon']])
  })

  it('illustrates every special evolution choice with its own animated/still 3x artwork', async () => {
    const item = { id: 'evolution2:solar-tempest', title: 'Solar Tempest', rarity: 'legendary' as const }
    const wrapper = mounted({ screen: 'hidden', upgradeEffect: 'soft',
      specialChoice: { kind: 'evolution', items: [item] } })
    await nextTick()
    const image = find('[data-choice="evolution2:solar-tempest"] .es2-card-art img') as HTMLImageElement
    expect(image.getAttribute('src')).toContain('solar-tempest@3x-animated.webp')
    expect(image.closest('picture')?.querySelector('source')?.getAttribute('srcset')).toContain('solar-tempest@3x.webp')
    await wrapper.setProps({ upgradeEffect: 'still' })
    expect(image.getAttribute('src')).toContain('solar-tempest@3x.webp')
  })

  it('renders every cursed relic with the cursed chest artwork, independent of its ID and rarity', async () => {
    mounted({ screen: 'hidden', specialChoice: { kind: 'treasure', items: [
      { id: 'relics:ashen-heart', title: 'Ashen Heart', rarity: 'epic' },
      { id: 'relics:fragile-crown', title: 'Fragile Crown', rarity: 'legendary' },
      { id: 'relics:frost-rune', title: 'Frost Rune', rarity: 'common' },
    ] } })
    await nextTick()
    for (const id of ['relics:ashen-heart', 'relics:fragile-crown']) {
      expect(find('[data-choice="' + id + '"] .es2-card-art img').getAttribute('src')).toBe(WORLD_ART.ui['treasure-cursed'])
    }
    expect(find('[data-choice="relics:frost-rune"] .es2-card-art img').getAttribute('src')).toBe(WORLD_ART.ui['treasure-common'])
  })

  it('keeps the settings hit target stable when the audio unlock button disappears', async () => {
    const wrapper = mounted({ audioUnlocked: false, musicOn: true })
    const settings = find('[data-es2-settings]')
    expect(find('[data-es2-audio-unlock]')).not.toBeNull()
    await wrapper.setProps({ audioUnlocked: true })
    await nextTick()
    expect(document.querySelector('[data-es2-audio-unlock]')).toBeNull()
    expect(find('[data-es2-settings]')).toBe(settings)
    settings.click()
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })

  it('forwards menu settings action to the host', async () => {
    const wrapper = mounted()
    click('[data-es2-settings]')
    await nextTick()
    expect(wrapper.emitted('settings')).toHaveLength(1)
  })

  it('keeps settings controlled and emits immediate volume, animation and shake changes', async () => {
    const wrapper = mounted({ settingsOpen: true, musicVolume: 70, sfxVolume: 50 })
    await nextTick()
    expect(find('.es2-dialog')?.textContent).toContain('遊戲設定')
    const sliders = document.querySelectorAll<HTMLInputElement>('.es2-slider-row input[type="range"]')
    sliders[0]!.value = '32'
    sliders[0]!.dispatchEvent(new Event('input', { bubbles: true }))
    expect(wrapper.emitted('musicVolume')).toEqual([[32]])
    click('.es2-toggle-set button:last-child')
    expect(wrapper.emitted('upgradeEffect')).toEqual([['still']])
    const audioButtons = document.querySelectorAll<HTMLButtonElement>('.es2-slider-row > button')
    expect(audioButtons).toHaveLength(2)
    expect(document.querySelectorAll('.es2-slider-row [role="switch"]')).toHaveLength(0)
    expect(audioButtons[0]?.textContent).toBe('♫')
    expect(audioButtons[1]?.textContent).toBe('♬')
    expect(audioButtons[0]?.getAttribute('aria-pressed')).toBe('false')
    expect(audioButtons[1]?.getAttribute('aria-pressed')).toBe('false')
    expect(find('.es2-slider-row label').textContent?.trim()).toBe('音樂 70%')
    expect(document.querySelectorAll('.es2-slider-row label')[1]?.textContent?.trim()).toBe('音效 50%')
    expect(find('.es2-setting-option > [role="switch"]').getAttribute('aria-checked')).toBe('false')
    audioButtons[0]!.click()
    audioButtons[1]!.click()
    await wrapper.setProps({ musicOn: false, sfxOn: false })
    expect(audioButtons[0]?.textContent).toBe('♪')
    expect(audioButtons[1]?.textContent).toBe('♩')
    expect(audioButtons[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(audioButtons[1]?.getAttribute('aria-pressed')).toBe('true')
    expect(wrapper.emitted('toggleMusic')).toHaveLength(1)
    expect(wrapper.emitted('toggleSfx')).toHaveLength(1)
    click('.es2-setting-option > [role="switch"]')
    expect(wrapper.emitted('cameraShake')).toEqual([[true]])
    click('.es2-close')
    expect(wrapper.emitted('closeSettings')).toHaveLength(1)
  })

  it('shows empty relic state instead of inventing loot and supports archive categories', async () => {
    mounted()
    click('.es2-hall-links button:nth-child(2)')
    await nextTick()
    expect(find('.es2-empty').textContent).toContain('尚無聖物資料')
    for (const index of [3, 4, 5]) {
      click(`.es2-archive-tabs button:nth-child(${index})`)
      await nextTick()
      expect(find('.es2-archive-section')).not.toBeNull()
    }
  })
})

describe('ES2 responsive and motion CSS contract', () => {
  const css = readFileSync(resolve('src/styles/es2/menu.css'), 'utf8')
  it('supports mobile safe areas, viewport-bounded dialogs and reduced motion', () => {
    expect(css).toContain('env(safe-area-inset-top)')
    expect(css).toContain('100dvh')
    expect(css).toContain('@media(max-width:610px)')
    expect(css).toContain('prefers-reduced-motion:reduce')
  })
  it('never adds gameplay screen-shake animations to upgrade cards', () => {
    expect(css).not.toMatch(/@keyframes\s+.*shake/i)
  })
})
