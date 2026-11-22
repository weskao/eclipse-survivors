import { describe, expect, it } from 'vitest'
import css from '../../../styles/es2/hud.css?raw'

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
