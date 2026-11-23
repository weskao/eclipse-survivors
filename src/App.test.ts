import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import App from './App.vue'
import { createEngine } from './game/engine'

describe('App', () => {
  it('mounts the engine on canvas#game and labels the menu with the CHANGELOG version', () => {
    const latest = readFileSync(resolve(process.cwd(), 'CHANGELOG.md'), 'utf8').match(/^## \[([0-9.]+)\]/m)?.[1]
    const stop = vi.fn()
    const engine = { ...createEngine(), mount: vi.fn(() => stop) }
    const w = mount(App, { props: { engine }, attachTo: document.body })

    const canvas = w.find('canvas#game')
    expect(canvas.exists()).toBe(true)
    expect(engine.mount).toHaveBeenCalledWith(canvas.element, expect.any(HTMLCanvasElement))
    expect(latest).toBeTruthy()
    expect(w.find('#gameVersion.menu-version').text()).toBe(`v${latest}`)

    w.unmount()
    expect(stop).toHaveBeenCalledOnce()
  })
  it('opens the live settings dialog from its menu action', async () => {
    const engine = { ...createEngine(), mount: vi.fn(() => vi.fn()) }
    const w = mount(App, { props: { engine }, attachTo: document.body })
    expect(engine.ui.settingsOpen).toBe(false)
    document.querySelector<HTMLButtonElement>('.es2-top-actions [data-es2-settings]')!.click()
    await nextTick()
    expect(engine.ui.settingsOpen).toBe(true)
    expect(document.querySelector('#es2-quality')).not.toBeNull()
    w.unmount()
  })

  it('uses the ES2 menu, combat HUD and mobile controls without mounting legacy copies', () => {
    const engine = { ...createEngine(), mount: vi.fn(() => vi.fn()) }
    const w = mount(App, { props: { engine }, attachTo: document.body })
    expect(w.find('.es2-menu').exists()).toBe(true)
    expect(w.find('.es2-hud').exists()).toBe(true)
    expect(w.find('.es2-mobile-controls').exists()).toBe(true)
    expect(w.find('#menu').exists()).toBe(false)
    expect(w.find('#hud').exists()).toBe(false)
    w.unmount()
  })

  it('applies accessibility preferences to the live page and restores the root on unmount', async () => {
    const engine = { ...createEngine(), mount: vi.fn(() => vi.fn()) }
    const root = document.documentElement
    const originalQuality = root.getAttribute('data-es2-quality')
    const wrapper = mount(App, { props: { engine }, attachTo: document.body })
    expect(root.getAttribute('data-es2-quality')).not.toBeNull()
    engine.openSettings()
    await nextTick()
    const quality = document.querySelector<HTMLButtonElement>('#es2-quality')
    expect(quality).not.toBeNull()
    quality!.click()
    await nextTick()
    document.querySelector<HTMLElement>('#es2-quality-listbox [data-es2-value="low"]')!.click()
    await nextTick()
    expect(root.getAttribute('data-es2-quality')).toBe('low')
    wrapper.unmount()
    expect(root.getAttribute('data-es2-quality')).toBe(originalQuality)
  })


  it('pauses before asking to leave a live run, resumes on cancel and returns home only after confirmation', async () => {
    const runtime = createEngine()
    const engine = { ...runtime, mount: vi.fn(() => vi.fn()) }
    const wrapper = mount(App, { props: { engine }, attachTo: document.body })
    engine.start()
    await nextTick()
    expect(engine.ui.mode).toBe('play')
    expect(wrapper.find('[data-es2-home]').exists()).toBe(true)
    await wrapper.get('[data-es2-home]').trigger('click')
    await nextTick()
    expect(engine.ui.mode).toBe('paused')
    expect(document.querySelector('[data-es2-home-confirm]')).not.toBeNull()
    expect(document.querySelector('#paused.active')).toBeNull()
    document.querySelector<HTMLButtonElement>('[data-es2-home-cancel]')!.click()
    await nextTick()
    expect(engine.ui.mode).toBe('play')
    expect(document.querySelector('[data-es2-home-confirm]')).toBeNull()
    await wrapper.get('[data-es2-home]').trigger('click')
    document.querySelector<HTMLButtonElement>('[data-es2-home-accept]')!.click()
    await nextTick()
    expect(engine.ui.mode).toBe('menu')
    expect(wrapper.find('[data-es2-home]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps the battle paused if the existing pause menu exit is cancelled', async () => {
    const runtime = createEngine()
    const engine = { ...runtime, mount: vi.fn(() => vi.fn()) }
    const wrapper = mount(App, { props: { engine }, attachTo: document.body })
    engine.start()
    engine.togglePause()
    await nextTick()
    expect(engine.ui.mode).toBe('paused')
    document.querySelector<HTMLButtonElement>('#leave')!.click()
    await nextTick()
    expect(document.querySelector('[data-es2-home-confirm]')).not.toBeNull()
    document.querySelector<HTMLButtonElement>('[data-es2-home-cancel]')!.click()
    await nextTick()
    expect(engine.ui.mode).toBe('paused')
    expect(document.querySelector('#paused.active')).not.toBeNull()
    wrapper.unmount()
  })

  it('makes continue battle the primary action and leave a secondary warning action', async () => {
    const runtime = createEngine()
    const engine = { ...runtime, mount: vi.fn(() => vi.fn()) }
    const wrapper = mount(App, { props: { engine }, attachTo: document.body })
    engine.start()
    await nextTick()
    await wrapper.get('[data-es2-home]').trigger('click')
    await nextTick()
    const resume = document.querySelector<HTMLButtonElement>('[data-es2-home-cancel]')!
    const exit = document.querySelector<HTMLButtonElement>('[data-es2-home-accept]')!
    expect(resume.classList.contains('es2-primary')).toBe(true)
    expect(exit.classList.contains('es2-secondary')).toBe(true)
    expect(exit.classList.contains('es2-danger-filled')).toBe(false)
    wrapper.unmount()
  })
  it('gives paused settings exclusive dialog focus and restores pause when settings close', async () => {
    const runtime = createEngine()
    const engine = { ...runtime, mount: vi.fn(() => vi.fn()) }
    const wrapper = mount(App, { props: { engine }, attachTo: document.body })
    engine.start()
    engine.togglePause()
    await nextTick()
    expect(document.querySelector('#paused.active')).not.toBeNull()
    engine.openSettings()
    await nextTick()
    expect(document.querySelector('#es2-quality')).not.toBeNull()
    expect(document.querySelector('#paused.active')).toBeNull()
    engine.closeSettings()
    await nextTick()
    expect(document.querySelector('#paused.active')).not.toBeNull()
    wrapper.unmount()
  })
  it('sends mobile dash to the real engine once and respects cooldown and pause', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(pointer:coarse)',
      media: query,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }))
    const engine = { ...createEngine(), mount: vi.fn(() => vi.fn()) }
    const wrapper = mount(App, { props: { engine }, attachTo: document.body })
    try {
      engine.start()
      await nextTick()
      const button = wrapper.get('[data-testid="es2-dash"]').element as HTMLButtonElement
      expect(button.disabled).toBe(false)
      const hero = engine.state.hero!
      expect(hero.dash).toBeLessThanOrEqual(0)
      button.click() // Native click is synthesized by a successful iOS touch tap.
      expect(hero.dash).toBeGreaterThan(0)
      expect(hero.inv).toBeGreaterThan(0)
      const cooldown = hero.dashCd
      button.click()
      expect(hero.dashCd).toBe(cooldown)
      engine.togglePause()
      await nextTick()
      expect(button.disabled).toBe(true)
    } finally {
      wrapper.unmount()
      vi.unstubAllGlobals()
    }
  })

  it('suppresses iPhone long-press on game surfaces without swallowing native controls or scrolling', () => {
    const engine = { ...createEngine(), mount: vi.fn(() => vi.fn()) }
    const wrapper = mount(App, { props: { engine }, attachTo: document.body })
    const touch = (target: Element, fingers = 1) => {
      const event = new Event('touchstart', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', { value: Array.from({ length: fingers }, () => ({})) })
      target.dispatchEvent(event)
      return event.defaultPrevented
    }
    const button = document.createElement('button')
    const scroll = document.createElement('div')
    const child = document.createElement('span')
    scroll.style.overflowY = 'auto'
    Object.defineProperties(scroll, {
      scrollHeight: { value: 200, configurable: true },
      clientHeight: { value: 100, configurable: true },
    })
    scroll.appendChild(child)
    document.body.append(button, scroll)
    try {
      expect(touch(wrapper.get('#game').element)).toBe(true)
      expect(touch(button)).toBe(false)
      expect(touch(child)).toBe(false)
      expect(touch(wrapper.get('#game').element, 2)).toBe(false)
    } finally {
      wrapper.unmount()
      button.remove()
      scroll.remove()
    }
    // Unmount must remove the capture listener, not leave the next app instance guarded.
    expect(touch(document.body)).toBe(false)
  })

})
