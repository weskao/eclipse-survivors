import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/es2/menu.css'), 'utf8')
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
  it('keeps long choices scrollable within notch and home-indicator safe areas', () => {
    expect(css).toContain('.es2-dialog{position:relative;overflow-y:auto')
    expect(css).toContain('safe-area-inset-top')
    expect(css).toContain('safe-area-inset-bottom')
    expect(css).not.toMatch(/\.es2-card-art img\{[^}]*object-fit:cover/)
  })
})
