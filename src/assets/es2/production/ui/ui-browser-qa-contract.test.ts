import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const scriptPath = resolve('scripts/es2-ui-17-browser-qa.mjs')
const workflowPath = resolve('.github/workflows/es2-ui-17-browser-qa.yml')

describe('ES2 17 UI production browser QA evidence contract', () => {
  it('requires a real Chromium image/viewport audit rather than just an archive snapshot', () => {
    expect(existsSync(scriptPath)).toBe(true)
    const script = readFileSync(scriptPath, 'utf8')
    for (const viewport of ['portrait-320', 'portrait-375', 'landscape-640', 'desktop-1440']) {
      expect(script).toContain(viewport)
    }
    for (const consumer of [
      'data-es2-world-ui', 'data-es2-achievement-badge', 'es2-world-hud-icon',
      'data-es2-rarity-icon', 'window.__test.level()',
    ]) expect(script).toContain(consumer)
    expect(script).toContain('naturalWidth')
    expect(script).toContain('getBoundingClientRect')
    expect(script).toContain('page.screenshot')
    expect(script).toContain('image.decode()')
  })

  it('runs the real browser audit and publishes evidence on the integration branch', () => {
    expect(existsSync(workflowPath)).toBe(true)
    const workflow = readFileSync(workflowPath, 'utf8')
    expect(workflow).toContain('feature/es2-release-readiness-integration')
    expect(workflow).toContain('node scripts/es2-ui-17-browser-qa.mjs')
    expect(workflow).toContain('actions/upload-artifact')
  })
})
