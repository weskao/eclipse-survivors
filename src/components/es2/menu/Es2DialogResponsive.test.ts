import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const css = read('src/styles/es2/menu.css')
const dialog = read('src/components/es2/menu/Es2Dialog.vue')
const picker = read('src/components/es2/menu/Es2ChoiceDialog.vue')
const relic = read('src/components/es2/relic-rewards/RelicRewardOverlay.vue')
const world = read('src/components/es2/world-event-ui/WorldEventPanel.vue')

describe('ES2 viewport-first dialogs', () => {
  it('keeps every dialog header and action footer visible while long bodies scroll inside safe areas', () => {
    expect(css).toMatch(/\.es2-dialog\{[^}]*display:flex;flex-direction:column;[^}]*overflow:hidden/)
    expect(css).toMatch(/\.es2-dialog-body\{[^}]*min-height:0;[^}]*overflow-y:auto/)
    expect(css).toMatch(/\.es2-dialog-actions\{[^}]*flex-shrink:0/)
    expect(css).toContain('safe-area-inset-top')
    expect(css).toContain('safe-area-inset-bottom')
    expect(dialog).toContain('class="es2-dialog-body"')
    expect(dialog).toContain('class="es2-dialog-actions"')
  })

  it('constrains settings to available width while preserving vertical scrolling', () => {
    expect(read('src/components/es2/menu/Es2Settings.vue')).toContain('variant="settings"')
    expect(css).toMatch(/\.es2-dialog-preferences\{[^}]*min-width:0;max-width:100%;overflow:clip/)
    expect(css).toMatch(/\.es2-dialog-preferences \.es2-dialog-body\{[^}]*overflow-x:hidden;overflow-y:auto/)
    expect(css).toMatch(/\.es2-dialog-preferences input\[type=range\]\{[^}]*min-width:0;max-width:100%;margin-inline:0/)
    expect(read('src/components/es2/accessibility/AccessibilitySettings.vue')).toContain('repeat(auto-fit, minmax(min(100%, 175px), 1fr))')
    expect(read('src/components/es2/menu/Es2Select.vue')).toContain('overflow-x: hidden; overflow-y: auto')
  })

  it('places level-up settings in the shared heading rather than consuming another row', () => {
    expect(dialog).toContain('<slot name="header-actions" />')
    expect(picker).toContain('<template #header-actions>')
    expect(picker).not.toContain('class="es2-choice-toolbar"')
  })

  it('shows three fully readable card choices as compact portrait rows or short-landscape columns', () => {
    expect(css).toMatch(/@media\s*\(max-width:610px\)\s*and\s*\(orientation:portrait\)[\s\S]*?\.es2-choice\{display:grid;grid-template-columns:/)
    expect(css).toMatch(/@media\s*\(orientation:landscape\)\s*and\s*\(max-height:520px\)[\s\S]*?\.es2-choice-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
    expect(css).not.toContain('-webkit-line-clamp')
    expect(css).toMatch(/\.es2-card-art img\{[^}]*object-fit:contain/)
  })

  it('keeps archive tabs available while browsing a long gallery', () => {
    expect(css).toMatch(/\.es2-archive-tabs\{[^}]*position:sticky;top:0;/)
    expect(css).toMatch(/\.es2-archive-tabs\{[^}]*overflow-x:auto;/)
  })

  it('uses compact relic cards and world-event choices on small mobile displays', () => {
    expect(relic).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.relic-rewards__claim\s*\{\s*display:grid/)
    expect(world).toMatch(/@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)/)
  })
})
