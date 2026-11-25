import test from 'node:test'
import assert from 'node:assert/strict'
import { assessHeroNorthernRunCoverage, heroVideoCaptureConfig, assessHeroCandidateCoverage, assessHeroEastActionCoverage } from './es2-hero-video-config.mjs'

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
    mirroredWestRunFrames: 0, eastRunFrames: 2, southRunFrames: 2, southeastRunFrames: 0, southwestRunFrames: 0, hasAllFourRunCandidateFrames: false, hasBothDirections: true,
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
  ]), { mirroredWestRunFrames: 0, eastRunFrames: 0, southRunFrames: 1, southeastRunFrames: 0, southwestRunFrames: 0, hasAllFourRunCandidateFrames: false, hasBothDirections: false })
})

test('candidate evidence rejects unrelated paths and query-string URL spoofing', () => {
  const hero = 'shadowblade'
  const path = `/src/assets/es2/production/heroes/${hero}/candidates/east-2026-11-23/run-east-4frames@3x.webp`
  const fake = [
    { src: `http://localhost:4174/unrelated.png?image=${encodeURIComponent(path)}`, sx: 0, sy: 0, sw: 704, sh: 704 },
    { src: `http://localhost:4174/other${path}`, sx: 704, sy: 0, sw: 704, sh: 704 },
  ]
  assert.deepEqual(assessHeroCandidateCoverage(hero, fake), {
    mirroredWestRunFrames: 0, eastRunFrames: 0, southRunFrames: 0, southeastRunFrames: 0, southwestRunFrames: 0, hasAllFourRunCandidateFrames: false, hasBothDirections: false,
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

test('mirrored West cannot count toward authored East', () => {
  const hero = 'shadowblade'
  const coverage = assessHeroCandidateCoverage(hero, [0, 1, 2, 3].map(i => ({ ...draw(hero, 'east', i), mirrored: true })))
  assert.equal(coverage.eastRunFrames, 0)
  assert.equal(coverage.mirroredWestRunFrames, 4)
})
test('ordinary east remains east; other heroes cannot claim mirrored West', () => {
  for (const hero of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
    const frame = draw(hero, 'east', 0)
    const coverage = assessHeroCandidateCoverage(hero, [frame, { ...frame, mirrored: true }, { ...frame, mirrored: true }])
    assert.equal(coverage.eastRunFrames, 1)
    assert.equal(coverage.mirroredWestRunFrames, hero === 'shadowblade' ? 1 : 0)
  }
})

const actionCell = (hero, pose, i) => ({
  src: `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/east-2026-11-23/${pose}-east-4frames@3x.webp`,
  sx: i % 2 * 704, sy: Math.floor(i / 2) * 704, sw: 704, sh: 704,
})

test('counts unique actual East attack and special cells independently for each hero', () => {
  for (const hero of ['shadowblade', 'spirit-summoner', 'crimson-paladin']) {
    const attack = [0, 1, 2, 3].map(i => actionCell(hero, 'attack', i))
    const special = [0, 1, 2, 3].map(i => actionCell(hero, 'special', i))
    assert.deepEqual(assessHeroEastActionCoverage(hero, [...attack, ...special]), {
      eastAttackFrames: 4, eastSpecialFrames: 4, hasAllEastActionCandidateFrames: true,
    })
    assert.equal(assessHeroEastActionCoverage(hero, [...attack, ...special.slice(0, 3)]).hasAllEastActionCandidateFrames, false)
  }
})

test('rejects other heroes, duplicate, mirrored, malformed and spoofed candidate draws', () => {
  const hero = 'shadowblade'
  const valid = actionCell(hero, 'attack', 0)
  const special = actionCell(hero, 'special', 1)
  assert.deepEqual(assessHeroEastActionCoverage(hero, [valid, valid, special,
    actionCell('spirit-summoner', 'attack', 1), { ...actionCell(hero, 'special', 2), mirrored: true },
    { ...actionCell(hero, 'attack', 2), sx: 1 }, { ...actionCell(hero, 'special', 3), sw: 768 },
    { ...actionCell(hero, 'attack', 3), src: `http://localhost:4174/other?src=${encodeURIComponent(valid.src)}` },
    actionCell(hero, 'run', 2),
  ]), { eastAttackFrames: 1, eastSpecialFrames: 1, hasAllEastActionCandidateFrames: false })
})

test('northern run evidence requires all four real distinct cells per eligible direction', () => {
  const cell = (hero, direction, index, batch = ((hero === 'shadowblade' && direction === 'n') || (hero === 'spirit-summoner' && direction === 'ne')) ? 5 : 4) => ({
    src: `http://localhost:4174/src/assets/es2/production/heroes/${hero}/candidates/${direction}-2026-11-24-batch-${batch}/run-${direction}-4frames@3x.webp`,
    sx: index % 2 * 768, sy: Math.floor(index / 2) * 768, sw: 768, sh: 768,
  })
  for (const [hero, directions] of [['shadowblade', ['n', 'ne', 'nw']], ['spirit-summoner', ['n', 'ne']], ['crimson-paladin', ['n']]]) {
    const draws = directions.flatMap(d => [0, 1, 2, 3].map(i => cell(hero, d, i)))
    assert.equal(assessHeroNorthernRunCoverage(hero, draws).complete, true)
    assert.equal(assessHeroNorthernRunCoverage(hero, draws.slice(1)).complete, false)
    assert.equal(assessHeroNorthernRunCoverage(hero, draws.map(d => ({ ...d, mirrored: true }))).complete, false)
  }
  assert.deepEqual(assessHeroNorthernRunCoverage('shadowblade', [cell('shadowblade', 'n', 0, 4), cell('crimson-paladin', 'ne', 0)]), { counts: { n: 0, ne: 0, nw: 0 }, complete: false })
  assert.equal(assessHeroNorthernRunCoverage('spirit-summoner', [cell('spirit-summoner', 'ne', 0, 4)]).counts.ne, 0)
})
