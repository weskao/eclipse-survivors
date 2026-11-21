import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import MenuScreen from './MenuScreen.vue'

const menuProps = {
  active: true,
  choice: 'knight' as const,
  musicOn: true,
  sfxOn: true,
  version: '1.0.0',
}

describe('fantasy UI art polish', () => {
  it('shows a distinct readable label on selected and unselected hero cards', () => {
    const menu = mount(MenuScreen, { props: menuProps })
    expect(menu.find('[data-job="knight"] .job-choose').text()).toContain('已選擇')
    expect(menu.find('[data-job="ranger"] .job-choose').text()).toContain('點擊選擇')
    expect(menu.find('[data-job="knight"]').attributes('aria-pressed')).toBe('true')
    expect(menu.find('[data-job="ranger"]').attributes('aria-pressed')).toBe('false')
  })

  it('includes generated spell art and readable interaction states', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/visual-polish.css'), 'utf8')
    expect(css).toContain('arcana-atlas.webp')
    expect(css).toMatch(/\.job:focus-visible/)
    expect(css).toMatch(/\.mode-choice\[aria-checked="true"\]/)
    expect(css).toMatch(/\.cosmetic-list button:disabled/)
    expect(css).toMatch(/prefers-reduced-motion/)
    const atlas = readFileSync(resolve(process.cwd(), 'src/assets/ui/arcana-atlas.webp'))
    expect(atlas.subarray(0, 4).toString()).toBe('RIFF')
    expect(atlas.subarray(8, 12).toString()).toBe('WEBP')
    expect(atlas.length).toBeGreaterThan(3000)
  })
})
