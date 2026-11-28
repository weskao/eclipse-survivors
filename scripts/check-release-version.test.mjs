import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./check-release-version.mjs', import.meta.url))
const check = (previous, current) => spawnSync(process.execPath, [script, previous, current], { encoding: 'utf8' })

for (const [previous, current] of [
  ['v1.2.0', '1.2.1'],
  ['v1.2.3', '1.2.4'],
  ['v1.2.98', '1.2.99'],
  ['v1.2.99', '1.3.0'],
  ['v1.2.5', '1.2.5'], // redeploy without creating a release
]) {
  test(`${previous} permits ${current}`, () => {
    const result = check(previous, current)
    assert.equal(result.status, 0, result.stderr)
  })
}

for (const [previous, current] of [
  ['v1.2.3', '1.2.5'],
  ['v1.2.5', '1.2.4'],
  ['v1.2.98', '1.3.0'],
  ['v1.2.99', '1.2.100'],
  ['v1.2.99', '1.3.1'],
  ['v1.2.99', '2.0.0'],
  ['v1.2.3', '1.2.04'],
  ['v1.2.3', '1.2.4-beta'],
  ['v1.2.100', '1.2.100'],
  ['', '1.2.1'],
]) {
  test(`${previous || '(missing previous version)'} rejects ${current}`, () => {
    const result = check(previous, current)
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /Release version:/)
  })
}
