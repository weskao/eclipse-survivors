import test from 'node:test'
import assert from 'node:assert/strict'
import { heroVideoCaptureConfig, assessHeroCandidateCoverage } from './es2-hero-video-config.mjs'

test('production gameplay recording never enables pending hero art', () => {
  const config = heroVideoCaptureConfig('http://127.0.0.1:4173/?foo=bar', false)
  assert.equal(config.url, 'http://127.0.0.1:4173/?foo=bar')
  assert.equal(config.output, 'artifacts/es2-hero-video')
  assert.equal(config.status, 'production')
})

test('candidate gameplay recording enables only the existing development QA switch', () => {
  const config = heroVideoCaptureConfig('http://127.0.0.1:4174/?foo=bar', true)
  const url = new URL(config.url)
  assert.equal(url.searchParams.get('es2HeroArtQA'), '1')
  assert.equal(url.searchParams.get('foo'), 'bar')
  assert.equal(config.output, 'artifacts/es2-hero-video/candidate-qa')
  assert.equal(config.status, 'QA_PENDING')
})

test('real Canvas draw evidence must contain distinct East and South running frames', () => {
  const hero = 'shadowblade'
  const east = `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/east-2026-11-23/run-east-4frames@3x.webp`
  const south = `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/south-2026-11-23/run-south-4frames@3x.webp`
  const observed = [
    { src: east, sx: 0, sy: 0, sw: 704, sh: 704 },
    { src: east, sx: 704, sy: 0, sw: 704, sh: 704 },
    { src: south, sx: 0, sy: 0, sw: 768, sh: 768 },
    { src: south, sx: 0, sy: 768, sw: 768, sh: 768 },
  ]
  assert.deepEqual(assessHeroCandidateCoverage(hero, observed), {
    eastRunFrames: 2, southRunFrames: 2, hasBothDirections: true,
  })
})

test('cannot claim coverage from another hero, duplicate frames or a malformed crop', () => {
  const hero = 'spirit-summoner'
  const src = `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/south-2026-11-23/run-south-4frames@3x.webp`
  const other = src.replace(hero, 'crimson-paladin')
  assert.deepEqual(assessHeroCandidateCoverage(hero, [
    { src, sx: 0, sy: 0, sw: 768, sh: 768 },
    { src, sx: 0, sy: 0, sw: 768, sh: 768 },
    { src, sx: 1, sy: 0, sw: 768, sh: 768 },
    { src: other, sx: 768, sy: 0, sw: 768, sh: 768 },
  ]), { eastRunFrames: 0, southRunFrames: 1, hasBothDirections: false })
})
