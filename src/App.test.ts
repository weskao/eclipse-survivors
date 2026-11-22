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
    document.querySelector<HTMLButtonElement>('.es2-top-actions button:last-child')!.click()
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
})
