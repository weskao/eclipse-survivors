import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Bilingual rule: dynamic values go through a named-parameter template, never `t(a + b)`.
// Concatenating inside t() builds a key the catalog cannot contain, producing mixed-language
// text or raw IDs (e.g. "本次遠征英雄：knight").
const root = join(process.cwd(), 'src')
const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name)
  if (entry.isDirectory()) return sources(path)
  return /\.(vue|ts)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : []
})

/** Returns the first argument of every `t(...)` call whose top level contains `+`. */
export function concatenatedTranslations(code: string): string[] {
  const found: string[] = []
  for (const match of code.matchAll(/(?<![\w$.])t\(/g)) {
    let depth = 0, quote = '', arg = ''
    for (let i = match.index + 2; i < code.length; i++) {
      const c = code[i]
      if (quote) { if (c === '\\') { arg += c + code[++i]; continue } if (c === quote) quote = '' }
      else if (c === '\'' || c === '"' || c === '`') quote = c
      else if ('([{'.includes(c)) depth++
      else if (')]}'.includes(c)) { if (depth-- === 0) break }
      else if (c === ',' && depth === 0) break
      else if (c === '+' && depth === 0) { found.push(arg.trim() + ' + …'); break }
      arg += c
    }
  }
  return found
}

describe('translation templates', () => {
  it('detects concatenation inside t() but allows named parameters', () => {
    expect(concatenatedTranslations(`t('前綴：' + id)`)).toHaveLength(1)
    expect(concatenatedTranslations(`t(name + ' 插畫')`)).toHaveLength(1)
    expect(concatenatedTranslations(`t('{name} 插畫', { name: t(a + b) })`)).toHaveLength(1)
    expect(concatenatedTranslations(`t('{name} 插畫', { name: t(label) }) + ' · '`)).toEqual([])
    expect(concatenatedTranslations(`t('a+b')`)).toEqual([])
    expect(concatenatedTranslations(`format(x + y)`)).toEqual([])
  })

  it('never concatenates strings inside a t() call anywhere in src', () => {
    const offenders = sources(root).flatMap(file =>
      concatenatedTranslations(readFileSync(file, 'utf8')).map(arg => `${relative(root, file)}: t(${arg})`))
    expect(offenders).toEqual([])
  })
})
