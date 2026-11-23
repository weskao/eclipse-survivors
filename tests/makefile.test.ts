import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const cwd = fileURLToPath(new URL('../', import.meta.url))
const make = (...args: string[]) =>
  execFileSync('make', ['--no-print-directory', '-n', ...args], { cwd, encoding: 'utf8' })

describe('Makefile development and release shortcuts', () => {
  it('starts a real unlocked Vite playtest instead of the normal server', () => {
    expect(make('dev-unlocked')).toContain('VITE_ES2_UNLOCKED=1')
    expect(make('dev-unlocked')).toContain('pnpm dev')
    expect(make('test-unlocked')).toContain('VITE_ES2_UNLOCKED=1')
    expect(make('dev')).not.toContain('VITE_ES2_UNLOCKED=1')
  })

  it('serves the phone over the LAN, with an unlocked variant', () => {
    const phone = make('phone')
    expect(phone).toContain('0.0.0.0')
    expect(phone).toContain('phone_dev.py')
    const unlocked = readFileSync(new URL('../Makefile', import.meta.url), 'utf8')
    expect(unlocked).toMatch(/phone-unlocked: export VITE_ES2_UNLOCKED := 1/)
  })

  it('dispatches the existing locked main-branch Pages release workflow', () => {
    expect(make('deploy')).toContain('gh workflow run release.yml --ref main')
    expect(make('deploy')).not.toContain('VITE_ES2_UNLOCKED')
  })
})
