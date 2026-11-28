import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const readEnv = name => parseEnv(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'))

test('ES4 checkout includes an enabled example and a valid shared Vite setting', () => {
  assert.ok(['0', '1'].includes(readEnv('.env').VITE_ES4_HALL))
  assert.equal(readEnv('.env.example').VITE_ES4_HALL, '1')
})
