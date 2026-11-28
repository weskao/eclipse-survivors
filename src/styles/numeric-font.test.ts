import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve('src')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const declarations = /(?:font-family|(?<![\w-])font)\s*:\s*[^;}\n]+/g
describe('numeric typography contract', () => {
  it('ships licensed local dotted-zero numerals and changes ASCII digits only', () => {
    const css = read('styles/numeric-font.css')
    expect(css).toContain('font-family: "Eclipse Numerals"')
    expect(css).toContain('unicode-range: U+0030-0039')
    expect(css).toContain('font-display: swap')
    expect(css).toContain('font-weight: 100 800')
    expect(read('main.ts')).toContain("import './styles/numeric-font.css'")
    const font = readFileSync(resolve(root, 'assets/fonts/JetBrainsMono-variable.woff2'))
    expect(font.subarray(0, 4).toString()).toBe('wOF2')
    expect(font.byteLength).toBe(113672)
    expect(readFileSync(resolve('public/fonts/JetBrainsMono-OFL.txt'), 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1')
  })

  it('keeps the original text stacks but prepends the digit-only family to explicit UI font declarations', () => {
    const paths = readdirSync(root, { recursive: true }).map(String)
      .filter(path => /\.(css|vue)$/.test(path) && path !== 'styles/numeric-font.css')
    const offenders: string[] = []
    for (const path of paths) {
      const source = read(path)
      const styles = path.endsWith('.vue') ? [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n') : source
      for (const [declaration] of styles.matchAll(declarations)) {
        if (/\b(?:Inter|Georgia|system-ui|Arial|sans-serif|serif|monospace)\b/.test(declaration) && !declaration.includes('var(--es2-font-numeric)')) offenders.push(path + ': ' + declaration)
      }
    }
    expect(offenders).toEqual([])
  })

  it('uses the same digit family for canvas combat damage and healing numbers', () => {
    expect(read('game/render/effects.ts')).toContain('const NUMBER_FONT_FAMILY = \'"Eclipse Numerals", system-ui, sans-serif\'')
    expect(read('game/render/effects.ts')).toContain('font: `900 ${size}px ${NUMBER_FONT_FAMILY}`')
    expect(read('game/render/effects.ts')).toContain('bossFont: `900 ${bossSize}px ${NUMBER_FONT_FAMILY}`')
  })
})
