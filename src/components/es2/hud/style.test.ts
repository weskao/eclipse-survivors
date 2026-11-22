import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/hud.css'), 'utf8')

describe('live HUD small screen and accessibility overrides', () => {
  const component = readFileSync(resolve(process.cwd(), 'src/components/es2/hud/CombatHud.vue'), 'utf8')

  it('keeps mobile objective and status columns inside safe areas', () => {
    expect(component).toContain('@media (max-width: 700px)')
    expect(component).toContain('safe-area-inset-left')
    expect(component).toContain('safe-area-inset-right')
    expect(component).toContain('max-width: 45vw')
  })

  it('exposes one polite live region and reduced-motion wave progress', () => {
    expect(component.match(/aria-live="polite"/g)).toHaveLength(1)
    expect(component).toContain('data-es2-announcement')
    expect(component).toContain('aria-label="波次進度"')
    expect(component).toContain('prefers-reduced-motion: reduce')
  })
})

describe('isolated ES2 HUD visual contract', () => {
  it('keeps styles namespaced and does not change the legacy HUD', () => {
    expect(css).toContain('.es2-hud')
    expect(css).not.toMatch(/(?:^|\n)\s*(?:html|body|#hud|#menu|#game)\b/)
  })
  it('contains mobile/tablet layouts, focus treatment and reduced-motion support', () => {
    expect(css).toContain('@media (max-width: 700px)')
    expect(css).toContain('@media (max-width: 400px)')
    expect(css).toContain('safe-area-inset-bottom')
    expect(css).toContain('focus-visible')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain('min-height: 44px')
  })
})
