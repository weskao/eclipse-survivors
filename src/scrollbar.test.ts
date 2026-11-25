import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve('src')
const globalStyle = join(root, 'style.css')
const standard = /\*\s*\{\s*scrollbar-width:\s*none;\s*\}/
const webkit = /\*::-webkit-scrollbar\s*\{\s*display:\s*none;\s*\}/

describe('global scrollbar policy', () => {
  it('hides scrollbars for all elements using the shared stylesheet', () => {
    const css = readFileSync(globalStyle, 'utf8')
    expect(css).toMatch(standard)
    expect(css).toMatch(webkit)
  })

  it('keeps scrollbar presentation centralized instead of overriding it in components', () => {
    for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !/\.(css|vue)$/.test(entry.name)) continue
      const path = join(entry.parentPath, entry.name)
      let css = readFileSync(path, 'utf8')
      if (path === globalStyle) css = css.replace(standard, '').replace(webkit, '')
      expect(css, path).not.toMatch(/scrollbar-(?:width|color)\s*:|::-webkit-scrollbar/)
    }
  })
})
