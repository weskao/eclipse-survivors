import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
const policy = readFileSync(resolve(process.cwd(), 'CLAUDE.md'), 'utf8')
const responsiveRules = readFileSync(resolve(process.cwd(), '.claude/rules/ui-responsive-layout.md'), 'utf8')

describe('phone menu uses surplus space for readable hero artwork', () => {
  it('allocates remaining portrait viewport height to the hero region rather than leaving unused space', () => {
    expect(css).toMatch(/@media \(orientation: portrait\) and \(max-width: 700px\)[\s\S]*?\.es2-menu-layout\s*\{[^}]*flex:\s*1[^;}]*;[^}]*grid-template-rows:\s*minmax\(0,1fr\) auto/)
    expect(css).toMatch(/\.es2-hero-section\s*\{[^}]*display:flex;[^}]*flex-direction:column/)
    expect(css).toMatch(/\.es2-hero-grid\s*\{[^}]*flex:\s*1[^;}]*;[^}]*grid-template-rows:\s*minmax\(0,1fr\)/)
    expect(css).toMatch(/\.es2-hero-card img\s*\{[^}]*flex:\s*1[^;}]*;[^}]*min-height:0/)
    expect(css).toMatch(/\.es2-menu \.es2-hero-section \.es2-roster__portrait\s*\{[^}]*flex:\s*1[^;}]*;[^}]*min-height:0/)
  })

  it('avoids shrinking heroes on short phones while retaining readable navigation and no content clipping', () => {
    expect(css).toContain('@media (orientation: portrait) and (max-width: 700px) and (max-height: 680px)')
    expect(css).toContain('object-fit:contain')
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
