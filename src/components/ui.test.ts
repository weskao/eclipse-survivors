import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { UP } from '../game/constants'
import { emptyHud } from '../game/store'
import type { HudView } from '../game/store'
import MenuScreen from './MenuScreen.vue'
import GameHud from './GameHud.vue'
import LevelUpOverlay from './LevelUpOverlay.vue'
import PauseOverlay from './PauseOverlay.vue'
import ResultOverlay from './ResultOverlay.vue'
import TouchControls from './TouchControls.vue'
import SettingsOverlay from './SettingsOverlay.vue'
import AudioControl from './AudioControl.vue'

const menuProps = { active: true, choice: 'knight' as const, musicOn: true, audioUnlocked: true, sfxOn: true, musicVolume: 100, sfxVolume: 100, version: '1.2.3' }

describe('AudioControl', () => {
  const props = { context: 'menu' as const, active: true, musicOn: true, sfxOn: true, musicVolume: 64, sfxVolume: 22 }

  it('merges both external buttons into one and adjusts each channel immediately', async () => {
    const w = mount(AudioControl, { props, attachTo: document.body })
    const trigger = w.get('#menuAudioTrigger')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('true')
    const panel = document.querySelector('#menuAudioPopover')!
    expect(panel).not.toBeNull()
    const music = panel.querySelector<HTMLInputElement>('#menuMusicVolume')!
    music.value = '33'
    music.dispatchEvent(new Event('input', { bubbles: true }))
    const sfx = panel.querySelector<HTMLInputElement>('#menuSfxVolume')!
    sfx.value = '81'
    sfx.dispatchEvent(new Event('input', { bubbles: true }))
    expect(w.emitted('musicVolume')?.at(-1)).toEqual([33])
    expect(w.emitted('sfxVolume')?.at(-1)).toEqual([81])
    panel.querySelector<HTMLButtonElement>('#menuMusicMute')!.click()
    panel.querySelector<HTMLButtonElement>('#menuSfxMute')!.click()
    expect(w.emitted('toggleMusic')).toHaveLength(1)
    expect(w.emitted('toggleSfx')).toHaveLength(1)
    await w.setProps({ active: false })
    await nextTick()
    expect(document.querySelector('#menuAudioPopover')).toBeNull()
    w.unmount()
  })

  it('closes on Escape and outside pointer while keeping the trigger accessible', async () => {
    const w = mount(AudioControl, { props, attachTo: document.body })
    await w.get('#menuAudioTrigger').trigger('click')
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(document.querySelector('#menuAudioPopover')).toBeNull()
    await w.get('#menuAudioTrigger').trigger('click')
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(w.get('#menuAudioTrigger').attributes('aria-expanded')).toBe('false')
    w.unmount()
  })
})

describe('MenuScreen', () => {
  it('renders the static menu structure', () => {
    const w = mount(MenuScreen, { props: menuProps })
    expect(w.find('#menu.overlay').classes()).toContain('active')
    const title = w.find('h1.game-title')
    expect(title.text()).toContain('ECLIPSE')
    expect(title.text()).toContain('SURVIVORS')
    expect(w.find('svg.menu-scene-art').exists()).toBe(true)
    expect(w.find('#heroSpotlight').element.tagName).toBe('IMG')
    expect(w.find('#spotlightName').text()).toBe('曙鋼騎士')
    expect(w.findAll('button.job').map(b => b.attributes('data-job'))).toEqual(['knight', 'ranger', 'wizard'])
    expect(w.find('.job .portrait img').attributes('alt')).toBe('knight')
    expect(w.find('#start').exists()).toBe(true)
    const v = w.find('#gameVersion')
    expect(v.text()).toBe('v1.2.3')
    expect(v.classes()).toContain('menu-version')
  })

  it('is inactive when active=false', () => {
    const w = mount(MenuScreen, { props: { ...menuProps, active: false } })
    expect(w.find('#menu').classes()).not.toContain('active')
  })

  it('emits select/start', async () => {
    const w = mount(MenuScreen, { props: menuProps })
    await w.find('[data-job="wizard"]').trigger('click')
    await w.find('#start').trigger('click')
    expect(w.emitted('select')).toEqual([['wizard']])
    expect(w.emitted('start')).toHaveLength(1)
  })

  it('keeps the music unlock prompt in layout after unlocking so a tap on start cannot shift away', async () => {
    // pointerdown unlocks audio; removing the prompt mid-tap moved #start before mouseup on phones.
    const w = mount(MenuScreen, { props: { ...menuProps, audioUnlocked: false } })
    expect(w.get('#enableMenuMusic').attributes('aria-hidden')).toBeUndefined()
    await w.setProps({ audioUnlocked: true })
    const prompt = w.find('#enableMenuMusic')
    expect(prompt.exists()).toBe(true)
    expect(prompt.classes()).toContain('is-unlocked')
    expect(prompt.attributes('aria-hidden')).toBe('true')
    expect(prompt.attributes('tabindex')).toBe('-1')
    expect(prompt.attributes('disabled')).toBeDefined()
    await w.setProps({ musicOn: false })
    expect(w.find('#enableMenuMusic').exists()).toBe(false)
  })

  it('opens the shared settings dialog from the main menu', async () => {
    const w = mount(MenuScreen, { props: menuProps })
    await w.find('.settings-trigger').trigger('click')
    expect(w.emitted('settings')).toHaveLength(1)
  })

  it('shows an accessible, distinct chosen-hero emblem without mutating the hero artwork', () => {
    const w = mount(MenuScreen, { props: menuProps })
    expect(w.get('[data-job="knight"]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-job="knight"] .job-crest').exists()).toBe(true)
    expect(w.find('[data-job="ranger"] .job-crest').exists()).toBe(true)
    expect(w.find('#heroSpotlight img').exists()).toBe(false)
    w.unmount()
  })

  it('follows choice prop', async () => {
    const w = mount(MenuScreen, { props: menuProps })
    const knightSrc = w.find('#heroSpotlight').attributes('src')
    await w.setProps({ choice: 'ranger' })
    expect(w.find('#heroSpotlight').attributes('src')).not.toBe(knightSrc)
    expect(w.find('#spotlightName').text()).toBe('夜痕遊俠')
    expect(w.find('#spotlightRole').text()).toBe('精準射擊 · 高機動')
    const pressed = w.findAll('button.job').filter(b => b.attributes('aria-pressed') === 'true')
    expect(pressed.map(b => b.attributes('data-job'))).toEqual(['ranger'])
    expect(w.findAll('button.job.selected')).toHaveLength(1)
  })

  it('replaces the two footer audio buttons with one compact control', async () => {
    const w = mount(MenuScreen, { props: menuProps })
    expect(w.find('#menuAudioTrigger').exists()).toBe(true)
    expect(w.find('#menuMusic').exists()).toBe(false)
    expect(w.find('#menuSfx').exists()).toBe(false)
    expect(w.findAll('#menuAudioTrigger')).toHaveLength(1)
    w.unmount()
  })
})

describe('GameHud', () => {
  const hud: HudView = { ...emptyHud(), who: '劍士 · LV.3', hpPct: 40, hpLabel: '生命 40 / 100', xpPct: 25, kill: 7, timer: '01:05', quest: 'Q' }
  const props = { active: true, hud, choice: 'knight' as const, musicOn: true, sfxOn: false, toastText: 'hi', toastVisible: true }

  it('renders values from props', () => {
    const w = mount(GameHud, { props })
    expect(w.find('#hud').classes()).toContain('active')
    expect(w.find('#who').text()).toBe('劍士 · LV.3')
    expect((w.find('#hpBar').element as HTMLElement).style.width).toBe('40%')
    expect((w.find('#xpBar').element as HTMLElement).style.width).toBe('25%')
    expect((w.find('#xpTrack').element as HTMLElement).style.width).toBe('25%')
    expect(w.find('#hpLabel').text()).toBe('生命 40 / 100')
    expect(w.find('#score').text()).toBe('7')
    expect(w.find('#timer').text()).toBe('01:05')
    expect(w.find('#quest').text()).toBe('Q')
    expect(w.find('#hudFace img').exists()).toBe(true)
    expect(w.find('#toast').text()).toBe('hi')
    expect((w.find('#toast').element as HTMLElement).style.opacity).toBe('1')
    expect(w.find('#hudAudioTrigger').exists()).toBe(true)
    expect(w.find('#music').exists()).toBe(false)
    expect(w.find('#sfx').exists()).toBe(false)
    expect(w.find('#pauser').attributes('aria-keyshortcuts')).toBe('P')
    expect(w.find('#pauser .pause-shortcut').text()).toBe('P')
    expect(w.find('#pauser .pause-shortcut').attributes('aria-hidden')).toBe('true')
    expect(w.find('canvas#minimap').exists()).toBe(true)
  })

  it('keeps top-right volume, settings and pause actions in a padded, spaced row', () => {
    const w = mount(GameHud, { props })
    const actions = w.get('#hud .hud-actions')
    expect(Array.from(actions.element.children).map(child =>
      child.classList.contains('audio-control') ? 'audio' :
      child.classList.contains('settings-trigger') ? 'settings' : child.id
    )).toEqual(['audio', 'settings', 'pauser'])
    const css = readFileSync(resolve(process.cwd(), 'src/settings.css'), 'utf8')
    expect(css).toMatch(/#hud \.stats \.chip\.hud-actions\s*\{[^}]*display:flex;[^}]*gap:8px;[^}]*padding:6px 13px;/)
    expect(css).toMatch(/#hud \.stats \.chip\.hud-actions\s*\{[^}]*gap:5px;[^}]*padding:5px 8px;/)
  })

  it('shows readable resource meters and highlights critical health', async () => {
    const w = mount(GameHud, { props })
    expect(w.get('#hudHealthMeter').attributes('role')).toBe('progressbar')
    expect(w.get('#hudHealthMeter').attributes('aria-valuenow')).toBe('40')
    expect(w.get('#hudExperienceMeter').attributes('role')).toBe('progressbar')
    expect(w.get('#hudExperienceMeter').attributes('aria-valuenow')).toBe('25')
    expect(w.get('#hud .status').classes()).not.toContain('status-critical')
    await w.setProps({ hud: { ...hud, hpPct: 18 } })
    expect(w.get('#hud .status').classes()).toContain('status-critical')
    expect(w.get('#hudHealthMeter').attributes('aria-valuenow')).toBe('18')
    w.unmount()
  })

  it('shows boss bar only when bossPct is set', async () => {
    const w = mount(GameHud, { props })
    expect(w.find('#bossWrap').classes()).not.toContain('show')
    await w.setProps({ hud: { ...hud, bossPct: 60 } })
    expect(w.find('#bossWrap').classes()).toContain('show')
    expect((w.find('#bossHealth').element as HTMLElement).style.width).toBe('60%')
  })

  it('emits toggles and pause; exposes minimap canvas', async () => {
    const w = mount(GameHud, { props })
    await w.find('#pauser').trigger('click')
    expect(w.emitted('pause')).toHaveLength(1)
    expect(w.vm.minimap).toBe(w.find('#minimap').element)
    await w.find('.settings-trigger').trigger('click')
    expect(w.emitted('settings')).toHaveLength(1)
  })

  it('hides toast when not visible', () => {
    const w = mount(GameHud, { props: { ...props, toastVisible: false } })
    expect((w.find('#toast').element as HTMLElement).style.opacity).toBe('0')
  })
})

describe('SettingsOverlay', () => {
  const props = { active: true, upgradeEffect: 'soft' as const, cameraShake: true }

  it('focuses on visual preferences without duplicating external audio controls', async () => {
    const w = mount(SettingsOverlay, { props })
    expect(w.find('[role="dialog"]').attributes('aria-label')).toBe('遊戲設定')
    expect(w.find('#settingsMusicVolume').exists()).toBe(false)
    expect(w.find('#settingsSfxVolume').exists()).toBe(false)
    expect(w.find('#settingsSoft').attributes('aria-pressed')).toBe('true')
    expect(w.find('#settingsStill').attributes('aria-pressed')).toBe('false')
    expect(w.find('#settingsCameraShake').attributes('aria-pressed')).toBe('true')
    await w.find('#settingsStill').trigger('click')
    await w.find('#settingsCameraShake').trigger('click')
    expect(w.emitted('upgradeEffect')?.at(-1)).toEqual(['still'])
    expect(w.emitted('cameraShake')?.at(-1)).toEqual([false])
    await w.find('#settingsClose').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('pairs motion choices with distinct visuals and descriptions', () => {
    const w = mount(SettingsOverlay, { props })
    expect(w.findAll('#settings .settings-choice-icon')).toHaveLength(2)
    expect(w.get('#settingsSoft .settings-choice-copy').text()).toContain('柔和淡入')
    expect(w.get('#settingsStill .settings-choice-copy').text()).toContain('無動畫')
    expect(w.find('#settings .settings-panel').exists()).toBe(true)
    w.unmount()
  })

  it('keeps keyboard tab focus inside the settings dialog', async () => {
    const w = mount(SettingsOverlay, { props, attachTo: document.body })
    const last = w.find('.settings-done').element as HTMLButtonElement
    const first = w.find('#settingsClose').element as HTMLButtonElement
    last.focus()
    await w.find('#settings').trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    first.focus()
    await w.find('#settings').trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
    w.unmount()
  })
})

describe('LevelUpOverlay', () => {
  const upgrades = UP.slice(0, 3)
  it('presents clearly separated rarity, ability and selection regions', () => {
    const w = mount(LevelUpOverlay, { props: { active: true, upgrades } })
    expect(w.find('#level .level-headline').exists()).toBe(true)
    expect(w.findAll('#upgrades .upgrade-action')).toHaveLength(3)
    expect(w.findAll('#upgrades .upgrade-rarity')).toHaveLength(3)
    expect(w.findAll('#upgrades .upgrade-action').every(a => a.text().includes('選擇'))).toBe(true)
    w.unmount()
  })

  it('renders 3 upgrades and emits choose', async () => {
    const w = mount(LevelUpOverlay, { props: { active: true, upgrades } })
    expect(w.find('#level.overlay').classes()).toContain('active')
    const items = w.findAll('#upgrades .upgrade')
    expect(items).toHaveLength(3)
    expect(items[1]!.attributes('data-up')).toBe(upgrades[1]!.id)
    expect(items[1]!.find('.portrait').text()).toBe(upgrades[1]!.icon)
    expect(items[1]!.find('strong').text()).toBe(upgrades[1]!.title)
    expect(items[1]!.text()).toContain('按 2 選擇')
    await items[1]!.trigger('click')
    expect(w.emitted('choose')).toEqual([[upgrades[1]!.id]])
    await w.find('.settings-trigger').trigger('click')
    expect(w.emitted('settings')).toHaveLength(1)
    await w.setProps({ effect: 'still' })
    expect(w.find('#level').classes()).toContain('still-upgrades')
  })
})

describe('PauseOverlay / ResultOverlay', () => {
  it('pause emits resume, leave and settings through the shared focused modal', async () => {
    const w = mount(PauseOverlay, { props: { active: true }, attachTo: document.body })
    expect(document.querySelector('#paused.active')).not.toBeNull()
    expect(document.querySelector('.es2-backdrop [role="dialog"][aria-modal="true"]')).not.toBeNull()
    document.querySelector<HTMLButtonElement>('#resume')!.click()
    document.querySelector<HTMLButtonElement>('#leave')!.click()
    expect(w.emitted('resume')).toHaveLength(1)
    expect(w.emitted('leave')).toHaveLength(1)
    document.querySelector<HTMLButtonElement>('.es2-backdrop .settings-trigger')!.click()
    expect(w.emitted('settings')).toHaveLength(1)
    w.unmount()
    expect(document.querySelector('#paused')).toBeNull()
  })
  it('result shows text and emits again/home', async () => {
    const w = mount(ResultOverlay, { props: { active: false, ending: 'E', summary: 'S' } })
    expect(w.find('#result').classes()).not.toContain('active')
    expect(w.find('#ending').text()).toBe('E')
    expect(w.find('#summary').text()).toBe('S')
    await w.find('#again').trigger('click')
    await w.find('#home').trigger('click')
    expect(w.emitted('again')).toHaveLength(1)
    expect(w.emitted('home')).toHaveLength(1)
  })
})

describe('TouchControls', () => {
  const setup = () => {
    const w = mount(TouchControls, { props: { active: true } })
    const stick = w.find('#stick').element as HTMLElement
    stick.setPointerCapture = vi.fn()
    stick.getBoundingClientRect = () => ({ left: 100, top: 100, width: 100, height: 100 }) as DOMRect
    return w
  }
  // jsdom re-serialises `translate(0,0)` as `translate(0px)`, so compare parsed offsets.
  const knob = (w: ReturnType<typeof setup>) => {
    const [x = 0, y = 0] = ((w.find('#knob').element as HTMLElement).style.transform.match(/-?[\d.]+/g) ?? []).map(Number)
    return [x, y]
  }

  it('emits normalised vector and null on release', async () => {
    const w = setup()
    expect(w.find('#touch').classes()).toContain('active')
    await w.find('#stick').trigger('pointerdown', { pointerId: 1, clientX: 150 + 43, clientY: 150 })
    expect(w.emitted('stick')![0]).toEqual([{ x: 1, y: 0 }])
    expect(knob(w)).toEqual([43, 0])
    await w.find('#stick').trigger('pointermove', { pointerId: 1, clientX: 150, clientY: 150 - 86 })
    expect(w.emitted('stick')![1]).toEqual([{ x: 0, y: -1 }])
    expect(knob(w)).toEqual([0, -43])
    await w.find('#stick').trigger('pointermove', { pointerId: 2, clientX: 150, clientY: 150 })
    expect(w.emitted('stick')).toHaveLength(2)
    await w.find('#stick').trigger('pointerup', { pointerId: 1 })
    expect(w.emitted('stick')![2]).toEqual([null])
    expect(knob(w)).toEqual([0, 0])
  })

  it('resets when deactivated and emits dash', async () => {
    const w = setup()
    await w.find('#stick').trigger('pointerdown', { pointerId: 1, clientX: 170, clientY: 150 })
    await w.setProps({ active: false })
    expect(knob(w)).toEqual([0, 0])
    expect(w.emitted('stick')!.at(-1)).toEqual([null])
    await w.find('#dash').trigger('click')
    expect(w.emitted('dash')).toBeUndefined()
    await w.setProps({ active: true })
    await w.find('#dash').trigger('click')
    expect(w.emitted('dash')).toHaveLength(1)
  })
})

describe('style.css', () => {
  it('keeps the reduced-motion rule', () => {
    expect(readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')).toContain('prefers-reduced-motion')
  })

  it('shows the pause shortcut only for fine-pointer desktop devices', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/visual-polish.css'), 'utf8')
    expect(css).toContain('#hud #pauser .pause-shortcut')
    expect(css).toContain('@media (hover: hover) and (pointer: fine)')
  })
})

describe('HUD and panel art-direction safeguards', () => {
  it('keeps visual effects CSS-only and disables panel animation for still/reduced-motion modes', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8')
    const css = readFileSync(resolve(process.cwd(), 'src/ui-fidelity.css'), 'utf8')
    expect(app).toContain("import './ui-fidelity.css'")
    expect(css).toContain('#level.still-upgrades')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('#menu .job.selected')
    expect(css).toContain('#hud .status')
    expect(css).toContain('#settings .settings-segments')
  })
})
