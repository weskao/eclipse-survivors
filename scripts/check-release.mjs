import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<!doctype html>/i, 'index.html must be an HTML document');
assert.match(html, /id="start"/, 'start control is required');
assert.match(html, /<h1 class="game-title">[\s\S]*?ECLIPSE[\s\S]*?SURVIVORS[\s\S]*?<\/h1>/,
  'the character selection screen must show the Eclipse Survivors game title');
assert.match(html, /<svg[^>]*class="menu-scene-art"/, 'the menu must contain original illustrated scenery');
assert.match(html, /id="heroSpotlight"/, 'selected hero must have a showcase image');
assert.match(html, /id="spotlightName"/, 'selected hero must have a readable name');
assert.match(html, /\$\('heroSpotlight'\)\.src=artSources\[choice\]/, 'switching classes must refresh spotlight art');
assert.match(html, /x\.setAttribute\('aria-pressed',String\(selected\)\)/, 'switching classes must refresh the accessibility state');
assert.match(html, /aria-pressed="true"/, 'selected hero button must expose its selection state');
assert.match(html, /prefers-reduced-motion/, 'decorative animations must respect reduced-motion preferences');
for (const job of ['knight', 'ranger', 'wizard']) {
  assert.match(html, new RegExp(`data-job="${job}"`), `${job} must remain selectable`);
}
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
  'site must work at /eclipse-survivors/, not depend on root-absolute asset paths');
console.log('Static release checks passed: entry point, UI, offline audio, inline JS syntax and relative URLs.');
