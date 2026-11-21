import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<!doctype html>/i, 'index.html must be an HTML document');
assert.match(html, /id="start"/, 'start control is required');
assert.match(html, /id="game"/, 'game canvas is required');
assert.match(html, /id="upgrades"/, 'upgrade UI is required');
assert.match(html, /id="music"/, 'music control is required');
assert.match(html, /audio\/mpeg|audio\/mp3|data:audio/i, 'music must be embedded for offline play');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length, 1, 'the self-contained game must have one inline game script');
new Script(scripts[0][1], { filename: 'index.html:inline.js' });
assert.doesNotMatch(html, /<(?:script|img|audio|source|link)\b[^>]+(?:src|href)\s*=\s*["'](?:https?:)?\/\//i,
  'release must not rely on third-party scripts/images/music');
assert.doesNotMatch(html, /<(?:script|img|audio|source|link)\b[^>]+(?:src|href)\s*=\s*["']\//i,
  'site must work at /survivor-game/, not depend on root-absolute asset paths');
console.log('Static release checks passed: entry point, UI, offline audio, inline JS syntax and relative URLs.');
