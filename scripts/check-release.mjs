// Static checks on the built site (run after `pnpm build`): local-only assets, relative URLs, bundled BGM.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const dist = new URL('../dist/', import.meta.url)
assert.ok(existsSync(new URL('index.html', dist)), 'dist/index.html missing: run `pnpm build` first')
const html = readFileSync(new URL('index.html', dist), 'utf8')
assert.match(html, /<!doctype html>/i, 'index.html must be an HTML document')
assert.match(html, /<div id="app">/, 'Vue mount point is required')
assert.match(html, /<script type="module"[^>]+src="\.\/assets\/[^"]+\.js"/, 'game bundle must be a relative module script')
assert.doesNotMatch(html, /<(?:script|img|audio|source|link)\b[^>]+(?:src|href)\s*=\s*["'](?:https?:)?\/\//i,
  'release must not rely on third-party scripts/images/music')
assert.doesNotMatch(html, /<(?:script|img|audio|source|link)\b[^>]+(?:src|href)\s*=\s*["']\//i,
  'site must work at /eclipse-survivors/, not depend on root-absolute asset paths')

const files = readdirSync(new URL('assets/', dist))
const js = files.filter(f => f.endsWith('.js')).map(f => readFileSync(new URL(`assets/${f}`, dist), 'utf8')).join('\n')
const css = files.filter(f => f.endsWith('.css')).map(f => readFileSync(new URL(`assets/${f}`, dist), 'utf8')).join('\n')
const mp3 = files.find(f => /^bgm-.*\.mp3$/.test(f))
assert.ok(mp3, 'background music must ship as a local mp3 file')
assert.ok(js.includes(mp3), 'the game bundle must reference the bundled mp3')
for (const art of ['knight', 'ranger', 'wizard', 'slime', 'bat', 'goblin', 'golem', 'boss', 'ground', 'courtyard']) {
  assert.ok(files.some(f => f.startsWith(`${art}-`) && f.endsWith('.webp')), `${art} art must be bundled locally`)
}
assert.doesNotMatch(js, /\bimport\s*\(\s*["']https?:|from\s*["']https?:/, 'no remote module imports')
assert.doesNotMatch(css, /url\(\s*["']?(?:https?:)?\/\//, 'no remote CSS assets (fonts/images)')
assert.ok(existsSync(new URL('manifest.webmanifest', dist)), 'manifest must ship with the site')
assert.ok(existsSync(new URL('assets/icon-192.png', dist)), 'manifest icons must ship with the site')
// Every local <link href> and the linked manifest's icon srcs must resolve inside dist/.
for (const [, href] of html.matchAll(/<link\b[^>]*\bhref="(?!https?:)([^"?#]+)/g)) {
  assert.ok(existsSync(new URL(href, dist)), `linked file ${href} is missing from dist/`)
}
const manifestHref = html.match(/<link\b[^>]*\brel="manifest"[^>]*\bhref="([^"]+)"/)?.[1]
assert.ok(manifestHref, 'index.html must link the web manifest')
const manifestUrl = new URL(manifestHref, dist)
for (const { src } of JSON.parse(readFileSync(manifestUrl, 'utf8')).icons) {
  assert.ok(existsSync(new URL(src, manifestUrl)), `manifest icon ${src} does not resolve next to ${manifestHref}`)
}
console.log('Release checks passed: relative module entry, local art + mp3, no remote URLs, manifest + icons.')
