import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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
})
