import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
const policy = readFileSync(resolve(process.cwd(), 'CLAUDE.md'), 'utf8')
const responsiveRules = readFileSync(resolve(process.cwd(), '.claude/rules/ui-responsive-layout.md'), 'utf8')

describe('phone menu uses surplus space for readable hero artwork', () => {
  it('uses height-aware artwork and a six-hero board without category hiding', () => {
    expect(css).toContain('.es2-hero-section')
    expect(css).toMatch(/\.es2-hero-section\s*\{[^}]*display:grid/)
    expect(css).toContain('object-fit:contain')
    expect(css).toContain('dvh')
    expect(css).not.toContain('.es2-menu[data-mobile-heroes="new"] .es2-hero-grid')
    expect(css).toContain('min-height:44px')
  })
})

describe('mandatory player-centric device-aware UI contract', () => {
  it('makes every feature UI conform across desktop, portrait, landscape, tablet and folding devices', () => {
    for (const term of ['desktop', 'portrait', 'landscape', 'tablet', 'foldable', 'safe-area', 'occlusion', 'player']) {
      expect(policy.toLowerCase()).toContain(term)
    }
    expect(policy).toContain('.claude/rules/ui-responsive-layout.md')
    expect(responsiveRules.toLowerCase()).toContain('unused space')
    expect(responsiveRules.toLowerCase()).toContain('human visual')
    expect(responsiveRules.toLowerCase()).toContain('hinge')
    expect(responsiveRules.toLowerCase()).toContain('real browser')
  })
})
