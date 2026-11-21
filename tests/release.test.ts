// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('release metadata', () => {
  const latest = read('CHANGELOG.md').match(/^## \[([0-9]+\.[0-9]+\.[0-9]+)\]/m)?.[1]
  it('package.json version equals the newest CHANGELOG release (rendered as #gameVersion)', () => {
    expect(latest).toBeTruthy()
    expect((JSON.parse(read('package.json')) as { version: string }).version).toBe(latest)
    expect(__APP_VERSION__).toBe(latest)
  })
  it('the Vite entry keeps the share/install metadata and mounts the app', () => {
    const html = read('index.html')
    expect(html).toMatch(/<title>暮境遠征｜ECLIPSE SURVIVORS<\/title>/)
    expect(html).toMatch(/property="og:image"/)
    expect(html).toMatch(/rel="manifest" href="manifest\.webmanifest"/)
    expect(html).toMatch(/<div id="app"><\/div>/)
  })
  it('waits for indexed Pages artifacts and tags only after successful deployment', () => {
    const workflow = read('.github/workflows/release.yml')
    expect(workflow).not.toMatch(/^\s+workflow_run:\s*$/m)
    expect(workflow).toContain('Wait for Pages artifact indexing')
    expect(workflow).toContain('actions: read')
    expect(workflow).toMatch(/needs:\s*deploy/)
    expect(workflow).toContain('gh release create')
  })

})
