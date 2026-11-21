import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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

const menuProps = { active: true, choice: 'knight' as const, musicOn: true, sfxOn: true, version: '1.2.3' }

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

  it('audio toggles follow props and emit', async () => {
    const w = mount(MenuScreen, { props: menuProps })
    expect(w.find('#menuMusic').text()).toBe('♫ 背景音樂：開')
    expect(w.find('#menuSfx').text()).toBe('♬ 音效：開')
    await w.setProps({ musicOn: false, sfxOn: false })
    expect(w.find('#menuMusic').text()).toBe('♫ 背景音樂：關')
    expect(w.find('#menuMusic').attributes('aria-pressed')).toBe('false')
    expect(w.find('#menuSfx').text()).toBe('♬ 音效：關')
    expect(w.find('#menuSfx').attributes('aria-pressed')).toBe('false')
    await w.find('#menuMusic').trigger('click')
    await w.find('#menuSfx').trigger('click')
    expect(w.emitted('toggleMusic')).toHaveLength(1)
    expect(w.emitted('toggleSfx')).toHaveLength(1)
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
    expect(w.find('#music').text()).toBe('♫')
    expect(w.find('#music').attributes('aria-pressed')).toBe('true')
    expect(w.find('#sfx').text()).toBe('♩')
    expect(w.find('#sfx').attributes('aria-pressed')).toBe('false')
    expect(w.find('canvas#minimap').exists()).toBe(true)
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
    await w.find('#music').trigger('click')
    await w.find('#sfx').trigger('click')
    await w.find('#pauser').trigger('click')
    expect(w.emitted('toggleMusic')).toHaveLength(1)
    expect(w.emitted('toggleSfx')).toHaveLength(1)
    expect(w.emitted('pause')).toHaveLength(1)
    expect(w.vm.minimap).toBe(w.find('#minimap').element)
  })

  it('hides toast when not visible', () => {
    const w = mount(GameHud, { props: { ...props, toastVisible: false } })
    expect((w.find('#toast').element as HTMLElement).style.opacity).toBe('0')
  })
})

describe('LevelUpOverlay', () => {
  const upgrades = UP.slice(0, 3)
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
  })
})

describe('PauseOverlay / ResultOverlay', () => {
  it('pause emits resume and leave', async () => {
    const w = mount(PauseOverlay, { props: { active: true } })
    expect(w.find('#paused').classes()).toContain('active')
    await w.find('#resume').trigger('click')
    await w.find('#leave').trigger('click')
    expect(w.emitted('resume')).toHaveLength(1)
    expect(w.emitted('leave')).toHaveLength(1)
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
    await w.find('#dash').trigger('pointerdown')
    expect(w.emitted('dash')).toHaveLength(1)
  })
})

describe('style.css', () => {
  it('keeps the reduced-motion rule', () => {
    expect(readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8')).toContain('prefers-reduced-motion')
  })
})
