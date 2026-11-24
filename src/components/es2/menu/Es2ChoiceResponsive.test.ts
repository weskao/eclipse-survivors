import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
const polish = readFileSync(resolve(process.cwd(), 'src/styles/es2/skill-polish.css'), 'utf8')
const cards = readFileSync(resolve(process.cwd(), 'src/components/es2/menu/Es2ChoiceCards.vue'), 'utf8')

describe('ES2 choice card responsive illustrations', () => {
  it('reserves image height separately from longer titles and descriptions', () => {
    expect(css).toMatch(/\.es2-card-art\{[^}]*flex:0 0 auto/)
    expect(css).toMatch(/\.es2-card-art img\{[^}]*object-fit:contain/)
    expect(cards).toContain('class="es2-card-art"')
    expect(cards).toContain('class="es2-card-description"')
  })
  it('uses responsive artwork sizes and a readable single-column narrow layout', () => {
    expect(css).toContain('height:clamp(135px,14vw,180px)')
    expect(css).toContain('height:clamp(118px,32vw,148px)')
    expect(css).toContain('height:clamp(142px,44vw,190px)')
    expect(css).toContain('grid-template-columns:1fr')
  })
  it('gives short-landscape cards a full-card art stage instead of a fixed thin strip', () => {
    const start = css.indexOf('@media (orientation:landscape) and (max-height:520px) {')
    const landscape = css.slice(start, css.indexOf('\n}', start))
    // Dialog fills the short viewport so the three cards stretch and the art takes the leftover height.
    expect(landscape).toMatch(/\.es2-dialog-choice\{height:calc\(100dvh/)
    expect(landscape).toMatch(/\.es2-dialog-choice \.es2-choice-grid\{[^}]*grid-template-rows:minmax\(min-content,1fr\)/)
    expect(landscape).toMatch(/\.es2-dialog-choice \.es2-choice \.es2-card-art\{[^}]*flex:1 1 0/)
    expect(landscape).not.toContain('height:clamp(50px,16dvh,76px)')
    // Rarity aura spans the whole card; rarity/key badges sit in a reserved band so they never cover the art.
    expect(landscape).toMatch(/\.es2-dialog-choice \.es2-choice\{[^}]*background:[^}]*var\(--es2-card-art-bg\)/)
    expect(landscape).toMatch(/\.es2-dialog-choice \.es2-choice \.es2-card-meta\{[^}]*position:absolute/)
    expect(landscape).toMatch(/\.es2-dialog-choice \.es2-choice \.es2-card-art\{[^}]*padding-top:/)
    expect(landscape).toMatch(/\.es2-dialog-choice \.es2-choice:active:not\(:disabled\)\{[^}]*transform:scale/)
  })
  it('keeps short-landscape card text at or above the 11px floor', () => {
    const blocks = [
      ['@media (orientation:landscape) and (max-height:520px) {', css],
      ['@media(max-height:570px) and (orientation:landscape){', polish],
    ] as const
    for (const [head, source] of blocks) {
      const start = source.indexOf(head)
      expect(start).toBeGreaterThanOrEqual(0)
      const block = source.slice(start, source.indexOf('\n}', start))
      for (const [, rem] of block.matchAll(/font-size:(?:clamp\()?\.(\d+)rem/g)) expect(Number(`0.${rem}`) * 16).toBeGreaterThanOrEqual(11)
    }
  })
  it('keeps long choices scrollable within the dialog body and notch-safe viewport', () => {
    expect(css).toMatch(/\.es2-dialog\{[^}]*display:flex;flex-direction:column;overflow:hidden/)
    expect(css).toMatch(/\.es2-dialog-body\{[^}]*min-height:0;overflow-y:auto/)
    expect(css).toContain('safe-area-inset-top')
    expect(css).toContain('safe-area-inset-bottom')
    expect(css).not.toMatch(/\.es2-card-art img\{[^}]*object-fit:cover/)
  })
})
