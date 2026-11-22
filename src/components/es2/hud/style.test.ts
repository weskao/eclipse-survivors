import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/hud.css'), 'utf8')
const component = readFileSync(resolve(process.cwd(), 'src/components/es2/hud/CombatHud.vue'), 'utf8')
const app = readFileSync(resolve(process.cwd(), 'src/App.vue'), 'utf8')

describe('responsive ES2 encounter and information rail', () => {
  it('stacks the boss and wave without separate fixed positions', () => {
    expect(component).toContain('data-es2-encounter')
    expect(component).toContain('v-if="view.boss || view.wave"')
    expect(css).toMatch(/\.es2-hud__encounter\s*\{[^}]*flex-direction: column/s)
    expect(css).not.toMatch(/\.es2-hud__boss\s*\{[^}]*position:\s*absolute/s)
    expect(css).not.toMatch(/\.es2-hud__wave\s*\{[^}]*top:\s*\d+px/s)
  })
  it('places mode progress, objectives and notices in one scrollable rail', () => {
    expect(app).toContain('#mode-progress')
    expect(app).not.toContain('class="es2-objective-hud"')
    expect(component).toContain('data-es2-information-rail')
    expect(component).toContain('<slot name="mode-progress" />')
    expect(css).toMatch(/\.es2-hud__side\s*\{[^}]*overflow-y:\s*auto/s)
    expect(css).toContain('--es2-side-top')
    expect(css).toContain('--es2-footer-clear')
  })
  it('supports phones, landscape height limits, safe areas and status scrolling', () => {
    expect(css).toContain('@media (max-width: 700px)')
    expect(css).toContain('@media (max-width: 400px)')
    expect(css).toContain('@media (min-width: 1061px) and (max-width: 1399px)')
    expect(css).toContain('@media (orientation: landscape) and (max-height: 520px)')
    expect(css).toContain('safe-area-inset-bottom')
    expect(css).toContain('safe-area-inset-left')
    expect(css).toContain('safe-area-inset-right')
    expect(css).toMatch(/\.es2-hud__statuses\s*\{[^}]*overflow-y:\s*auto/s)
    expect(css).toContain('focus-visible')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('min-height: 44px')
  })
  it('keeps one polite announcement and real wave progress accessible', () => {
    expect(component.match(/aria-live="polite"/g)).toHaveLength(1)
    expect(component).toContain('data-es2-announcement')
    expect(component).toContain('aria-label="波次進度"')
  })
  it('keeps ES2 styles scoped and avoids changing the legacy game', () => {
    expect(css).toContain('.es2-hud')
    expect(css).not.toMatch(/(?:^|\n)\s*(?:html|body|#hud|#menu|#game)\b/)
  })
})
