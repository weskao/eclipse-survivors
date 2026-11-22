import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/hud.css'), 'utf8')

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
