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
  const south = `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/south-2026-11-24-batch-2/run-south-4frames@3x.webp`
  const observed = [
    { src: east, sx: 0, sy: 0, sw: 704, sh: 704 },
    { src: east, sx: 704, sy: 0, sw: 704, sh: 704 },
    { src: south, sx: 0, sy: 0, sw: 768, sh: 768 },
    { src: south, sx: 0, sy: 768, sw: 768, sh: 768 },
  ]
  assert.deepEqual(assessHeroCandidateCoverage(hero, observed), {
    eastRunFrames: 2, southRunFrames: 2, southeastRunFrames: 0, southwestRunFrames: 0, hasAllFourRunCandidateFrames: false, hasBothDirections: true,
  })
})

test('cannot claim coverage from another hero, duplicate frames or a malformed crop', () => {
  const hero = 'spirit-summoner'
  const src = `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/south-2026-11-24-mist-repair/run-south-4frames@3x.webp`
  const other = src.replace(hero, 'crimson-paladin')
  assert.deepEqual(assessHeroCandidateCoverage(hero, [
    { src, sx: 0, sy: 0, sw: 768, sh: 768 },
    { src, sx: 0, sy: 0, sw: 768, sh: 768 },
    { src, sx: 1, sy: 0, sw: 768, sh: 768 },
    { src: other, sx: 768, sy: 0, sw: 768, sh: 768 },
  ]), { eastRunFrames: 0, southRunFrames: 1, southeastRunFrames: 0, southwestRunFrames: 0, hasAllFourRunCandidateFrames: false, hasBothDirections: false })
})

test('candidate evidence rejects unrelated paths and query-string URL spoofing', () => {
  const hero = 'shadowblade'
  const path = `/src/assets/es2/production/heroes/${hero}/candidates/east-2026-11-23/run-east-4frames@3x.webp`
  const fake = [
    { src: `http://localhost:4174/unrelated.png?image=${encodeURIComponent(path)}`, sx: 0, sy: 0, sw: 704, sh: 704 },
    { src: `http://localhost:4174/other${path}`, sx: 704, sy: 0, sw: 704, sh: 704 },
  ]
  assert.deepEqual(assessHeroCandidateCoverage(hero, fake), {
    eastRunFrames: 0, southRunFrames: 0, southeastRunFrames: 0, southwestRunFrames: 0, hasAllFourRunCandidateFrames: false, hasBothDirections: false,
  })
})

test('new South gameplay evidence uses the exact selected atlas, not the superseded clip', () => {
  for (const hero of ['shadowblade', 'crimson-paladin']) {
    const draw = folder => ({ src: `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/${folder}/run-south-4frames@3x.webp`, sx: 0, sy: 0, sw: 768, sh: 768 })
    assert.equal(assessHeroCandidateCoverage(hero, [draw('south-2026-11-24-batch-2')]).southRunFrames, 1)
    assert.equal(assessHeroCandidateCoverage(hero, [draw('south-2026-11-23')]).southRunFrames, 0)
  }
})

test('Summoner gameplay evidence accepts only repaired South atlas', () => {
  const hero = 'spirit-summoner'
  const draw = folder => ({ src: `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/${folder}/run-south-4frames@3x.webp`, sx: 0, sy: 0, sw: 768, sh: 768 })
  assert.equal(assessHeroCandidateCoverage(hero, [draw('south-2026-11-24-mist-repair')]).southRunFrames, 1)
  assert.equal(assessHeroCandidateCoverage(hero, [draw('south-2026-11-23')]).southRunFrames, 0)
})

const draw = (hero, direction, index, folder) => {
  const size = direction === 'east' ? 704 : 768
  const selected = direction === 'east' ? 'east-2026-11-23' : direction === 'south' ? (hero === 'spirit-summoner' ? 'south-2026-11-24-mist-repair' : 'south-2026-11-24-batch-2') : `${direction}-2026-11-24-batch-3`
  return { src: `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/${folder ?? selected}/run-${direction}-4frames@3x.webp`, sx: index % 2 * size, sy: Math.floor(index / 2) * size, sw: size, sh: size }
}

test('requires all four real source cells in all four authored run directions for each hero', () => {
  for (const hero of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
    const draws = ['east', 'south', 'se', 'sw'].flatMap(direction => [0, 1, 2, 3].map(i => draw(hero, direction, i)))
    const coverage = assessHeroCandidateCoverage(hero, draws)
    assert.equal(coverage.southeastRunFrames, 4)
    assert.equal(coverage.southwestRunFrames, 4)
    assert.equal(coverage.hasAllFourRunCandidateFrames, true)
    assert.equal(assessHeroCandidateCoverage(hero, draws.slice(0, -1)).hasAllFourRunCandidateFrames, false)
  }
})

test('rejects old folders, other heroes, duplicate frames and malformed diagonal crops', () => {
  const hero = 'shadowblade'
  const valid = draw(hero, 'se', 0)
  const coverage = assessHeroCandidateCoverage(hero, [valid, valid, draw(hero, 'se', 1, 'se-2026-11-23'), draw('spirit-summoner', 'se', 1), {...draw(hero, 'se', 1), sw: 704}, {...draw(hero, 'sw', 0), sx: 1}])
  assert.equal(coverage.southeastRunFrames, 1)
  assert.equal(coverage.southwestRunFrames, 0)
  assert.equal(coverage.hasAllFourRunCandidateFrames, false)
})
