import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)][0]?.[1] ?? '';
const latestVersion = changelog.match(/^## \[([0-9]+\.[0-9]+\.[0-9]+)\]/m)?.[1];

test('the selection menu shows the actual latest release version', () => {
  assert.ok(latestVersion, 'the changelog must contain a current release');
  assert.match(html, new RegExp('id="gameVersion"[^>]*>v' + latestVersion.replace(/\./g, '\\.') + '<'));
  assert.match(html, /class="menu-version"/);
});

test('menu music runs only after Web Audio has been unlocked by user interaction', () => {
  assert.match(source, /function menuScore\(/);
  assert.match(source, /function music\([\s\S]*?menuScore\(\)/);
  assert.match(source, /addEventListener\('pointerdown'[\s\S]*?wakeAudio/);
  assert.match(source, /mode!=='menu'/);
});

test('menu and HUD expose separate saved toggles for music and effects', () => {
  for (const id of ['menuMusic', 'menuSfx', 'music', 'sfx']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(source, /function toggleMusic\(/);
  assert.match(source, /function toggleSfx\(/);
  assert.match(source, /localStorage\.setItem\('starSfx'/);
  assert.match(source, /localStorage\.setItem\('starMusic'/);
});

test('SFX have a shared throttle and unique cues across core gameplay events', () => {
  assert.match(source, /function playSfx\(/);
  assert.match(source, /sfxCooldown/);
  for (const cue of ['select', 'start', 'pause', 'resume', 'upgrade', 'level', 'dash', 'knight', 'ranger', 'wizard', 'kill', 'boss', 'hurt', 'pickup', 'scene', 'victory', 'defeat']) {
    assert.match(source, new RegExp("playSfx\\('" + cue + "'\\)"), cue + ' cue missing');
  }
});

test('offline gameplay stays syntactically valid, without external audio dependencies', () => {
  assert.match(html, /data:audio\/mpeg;base64,/);
  assert.doesNotMatch(html, /<script\s+src="https?:/);
  assert.doesNotMatch(html, /<audio[^>]*src="https?:/);
  new Script(source, { filename: 'index.html' });
});
