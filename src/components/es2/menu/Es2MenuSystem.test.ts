import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { emptyProfile } from '../../../meta/profile'
import { createMetaState } from '../../../game/content/meta/state'
import { cosmeticAura } from '../../../meta/cosmetics'
import { HERO_DEFINITIONS } from '../../../game/content/heroes'
import type { RunStats } from '../../../meta/types'
import { UP } from '../../../game/constants'
import Es2MenuSystem from './Es2MenuSystem.vue'
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from '../../../game/content/accessibility/preferences'
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
    click('[data-es2-expedition-navigation]')
    await nextTick()
    click('[data-mode="challenge"]')
    click('.es2-start')
    expect(wrapper.emitted('select')).toEqual([['ranger']])
    expect(wrapper.emitted('mode')).toEqual([['challenge']])
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(find('[data-hero="knight"] img').getAttribute('src')).toBeTruthy()
  })

  it('uses a single progression heading and authoritative hall wallet without redundant inner chrome', async () => {
    const profile = emptyProfile()
    profile.embers = 184
    const state = createMetaState()
    state.embers = 184
    mounted({ profile, metaState: state, metaStatus: 'ready' })
    click('.es2-hall-links button')
    await nextTick()
    const archive = find('[data-es2-archive-page]')
    expect(archive.querySelectorAll('h2')).toHaveLength(1)
    expect(archive.querySelector('.es2-progression-wallet')).toBeNull()
    expect(document.querySelectorAll('[data-es2-ember-wallet]')).toHaveLength(1)
    expect(find('[data-es2-ember-value]').textContent).toBe('184')
    expect(archive.querySelector('[data-research="power"]')).not.toBeNull()
  })

  it('previews the actual equipped cosmetic palette and forwards unlocked selection without mutating the profile', async () => {
    const profile = emptyProfile()
    profile.unlockedCosmetics.push('knight-gilded')
    const wrapper = mounted({ profile })
    click('.es2-hall-links button')
    await nextTick()
    const skin = find('[data-es2-cosmetic-option="knight-gilded"]')
    expect(skin.querySelector('img')?.getAttribute('src')).toBeTruthy()
    expect(skin.style.getPropertyValue('--es2-skin-ring')).toBe(cosmeticAura('knight-gilded')[1])
    skin.click()
    expect(wrapper.emitted('cosmetic')).toEqual([['knight', 'knight-gilded']])
    expect(profile.equippedCosmetics.knight).toBe('knight-default')
    await wrapper.setProps({ profile: { ...profile, equippedCosmetics: { ...profile.equippedCosmetics, knight: 'knight-gilded' } } })
    expect(skin.getAttribute('aria-pressed')).toBe('true')
    expect(find('[data-hero="knight"]').getAttribute('data-es2-cosmetic')).toBe('knight-gilded')
    expect(find('[data-hero="knight"]').style.getPropertyValue('--es2-skin-ring')).toBe(cosmeticAura('knight-gilded')[1])
    expect(cosmeticAura('knight-default')).not.toEqual(cosmeticAura('knight-gilded'))
  })

  it('passes the actual selected specialization into its cosmetic cards', async () => {
    const profile = emptyProfile()
    const wrapper = mounted({ profile, choice: 'knight', heroId: 'shadowblade' })
    click('.es2-hall-links button')
    await nextTick()
    expect(find('[data-es2-cosmetic-option="knight-gilded"] img').getAttribute('src')).toBe(HERO_DEFINITIONS.shadowblade.portraitSrc)
    await wrapper.setProps({ choice: 'wizard', heroId: 'spirit-summoner' })
    expect(find('[data-es2-cosmetic-option="wizard-astral"] img').getAttribute('src')).toBe(HERO_DEFINITIONS['spirit-summoner'].portraitSrc)
    await wrapper.setProps({ choice: 'knight', heroId: 'crimson-paladin' })
    expect(find('[data-es2-cosmetic-option="knight-default"] img').getAttribute('src')).toBe(HERO_DEFINITIONS['crimson-paladin'].portraitSrc)
  })

  it('opens progression, spends nothing without funds, and confirms reset safely', async () => {
    const wrapper = mounted()
    click('.es2-hall-links button')
    await nextTick()
    expect(find('[data-es2-archive-page]')?.textContent).toContain('永久強化')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
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

  it('uses animated skill art normally and still art for accessibility preferences', async () => {
    const wrapper = mounted({ screen: 'level', upgradeEffect: 'soft', upgrades: [UP.find(u => u.id === 'speed')!],
      accessibilityPreferences: { ...DEFAULT_ACCESSIBILITY_PREFERENCES } })
    const image = () => find('[data-choice="speed"] .es2-card-art img').getAttribute('src')
    expect(image()).toContain('speed@3x-animated.webp')
    await wrapper.setProps({ accessibilityPreferences: { ...DEFAULT_ACCESSIBILITY_PREFERENCES, reducedFlashing: true } })
    expect(image()).toContain('speed@3x.webp')
    await wrapper.setProps({ accessibilityPreferences: { ...DEFAULT_ACCESSIBILITY_PREFERENCES, reducedMotion: 'on' } })
    expect(image()).toContain('speed@3x.webp')
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
    expect(audioButtons[0]?.querySelector('svg[data-audio-icon="music-muted"] path[data-mute-mark]')).not.toBeNull()
    expect(audioButtons[1]?.querySelector('svg[data-audio-icon="sfx-muted"] path[data-mute-mark]')).not.toBeNull()
    expect(audioButtons[0]?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(audioButtons[1]?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(audioButtons[0]?.textContent).toBe('')
    expect(audioButtons[1]?.textContent).toBe('')
    expect(audioButtons[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(audioButtons[1]?.getAttribute('aria-pressed')).toBe('true')
    expect(wrapper.emitted('toggleMusic')).toHaveLength(1)
    expect(wrapper.emitted('toggleSfx')).toHaveLength(1)
    await wrapper.setProps({ musicOn: true })
    expect(audioButtons[0]?.textContent).toBe('♫')
    expect(audioButtons[0]?.querySelector('svg')).toBeNull()
    expect(audioButtons[1]?.querySelector('[data-audio-icon="sfx-muted"]')).not.toBeNull()
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
      click(`.es2-hall-links button:nth-child(${index})`)
      await nextTick()
      expect(find('.es2-archive-section')).not.toBeNull()
      expect(find(`.es2-hall-links button:nth-child(${index})`).getAttribute('aria-current')).toBe('page')
      expect(document.querySelector('[role="dialog"]')).toBeNull()
    }
  })

  it('shows unlocked archive details on request, with no disclosure of undiscovered entries', async () => {
    const wrapper = mounted({ relics: [
      { id: 'known', title: 'Known relic', owned: true, description: 'Known effect', effect: 'Known effect' },
      { id: 'secret', title: 'Secret relic', owned: false, effect: 'Secret effect' },
    ] })
    click('.es2-hall-links button:nth-child(2)')
    await nextTick()
    expect(find('[data-es2-archive-page]').textContent).not.toContain('Known effect')
    expect(find('[data-es2-card-info="relic:known"]')).not.toBeNull()
    expect(document.querySelector('[data-es2-card-info="relic:secret"]')).toBeNull()
    expect(find('[data-es2-archive-page]').textContent).not.toContain('Secret effect')
    click('[data-es2-card-info="relic:known"]')
    await nextTick()
    expect(find('[role="dialog"]').textContent).toContain('Known effect')
    expect(find('[role="dialog"]').textContent).not.toContain('Secret effect')
    expect(wrapper.emitted('purchase')).toBeUndefined()
    click('.es2-close')
    await nextTick()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('uses a single hall navigation, preserves lobby selection and restores the expedition page when returning', async () => {
    const wrapper = mounted({ heroId: 'shadowblade', runMode: 'boss-rush' })
    click('[data-es2-expedition-navigation]')
    await nextTick()
    click('.es2-hall-links button')
    await nextTick()
    expect(document.querySelectorAll('[data-es2-hall-navigation]')).toHaveLength(1)
    expect(document.querySelector('.es2-archive-tabs')).toBeNull()
    expect(find('[data-es2-archive-page]').getAttribute('data-es2-archive-page')).toBe('progression')
    expect(find('[data-es2-lobby-content]').getAttribute('hidden')).not.toBeNull()
    expect(find('.es2-menu-action-bar').style.display).toBe('none')
    expect(wrapper.emitted('start')).toBeUndefined()
    click('[data-es2-return-lobby]')
    await nextTick()
    expect(document.querySelector('[data-es2-archive-page]')).toBeNull()
    expect(find('.es2-menu').getAttribute('data-es2-menu-page')).toBe('modes')
    expect(find('[data-es2-expedition-summary]').getAttribute('data-run-mode')).toBe('boss-rush')
    expect(find('[data-es2-selected-hero]').getAttribute('data-es2-selected-hero')).toBe('shadowblade')
    expect(find('.es2-menu-action-bar').style.display).not.toBe('none')
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
