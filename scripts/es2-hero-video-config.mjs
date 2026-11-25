/** Keep unapproved candidate footage visibly separate from the release build. */
export function heroVideoCaptureConfig(baseUrl, candidateQA = false, defaultEntry = false) {
  const url = new URL(baseUrl)
  if (candidateQA && !defaultEntry) url.searchParams.set('es2HeroArtQA', '1')
  return {
    url: url.toString(),
    output: candidateQA ? 'artifacts/es2-hero-video/candidate-qa' : 'artifacts/es2-hero-video',
    status: candidateQA ? 'QA_PENDING' : 'production',
  }
}

/** Verify actual candidate Canvas drawing, not merely a candidate image URL load. */
export function assessHeroCandidateCoverage(hero, draws) {
  const frames = { E: new Set(), S: new Set(), SE: new Set(), SW: new Set() }
  const mirroredWest = new Set()
  for (const { src, sx, sy, sw, sh, mirrored } of draws) {
    for (const [direction, name, size] of [
      ['E', 'east', 704], ['S', 'south', 768], ['SE', 'se', 768], ['SW', 'sw', 768],
    ]) {
      // Match the actual image pathname; a query parameter or unrelated path is not Canvas evidence.
      let pathname
      try { pathname = new URL(src).pathname } catch { continue }
      const folder = direction === 'S'
        ? hero === 'spirit-summoner' ? 'south-2026-11-24-mist-repair' : 'south-2026-11-24-batch-2'
        : direction === 'E' ? 'east-2026-11-23' : `${name}-2026-11-24-batch-3`
      const expected = `/src/assets/es2/production/heroes/${hero}/candidates/${folder}/run-${name}-4frames@3x.webp`
      if (pathname !== expected) continue
      if (sw !== size || sh !== size || ![0, size].includes(sx) || ![0, size].includes(sy)) continue
      if (mirrored) {
        if (hero === 'shadowblade' && direction === 'E') mirroredWest.add(`${sx}:${sy}`)
        continue
      }
      frames[direction].add(`${sx}:${sy}`)
    }
  }
  return {
    mirroredWestRunFrames: mirroredWest.size,
    eastRunFrames: frames.E.size,
    southRunFrames: frames.S.size,
    southeastRunFrames: frames.SE.size,
    southwestRunFrames: frames.SW.size,
    hasAllFourRunCandidateFrames: Object.values(frames).every(cells => cells.size === 4),
    hasBothDirections: frames.E.size >= 2 && frames.S.size >= 2,
  }
}

/** Report real East attack/special candidate cells independently of run evidence. */
export function assessHeroEastActionCoverage(hero, draws) {
  const frames = { attack: new Set(), special: new Set() }
  for (const { src, sx, sy, sw, sh, mirrored } of draws) {
    if (mirrored || sw !== 704 || sh !== 704 || ![0, 704].includes(sx) || ![0, 704].includes(sy)) continue
    let pathname
    try { pathname = new URL(src).pathname } catch { continue }
    for (const pose of ['attack', 'special']) {
      if (pathname === `/src/assets/es2/production/heroes/${hero}/candidates/east-2026-11-23/${pose}-east-4frames@3x.webp`)
        frames[pose].add(`${sx}:${sy}`)
    }
  }
  return {
    eastAttackFrames: frames.attack.size,
    eastSpecialFrames: frames.special.size,
    hasAllEastActionCandidateFrames: frames.attack.size === 4 && frames.special.size === 4,
  }
}

/** Selected authored northern clips and their exact source batch. */
export function heroNorthernRunBatches(hero) {
  if (hero === 'shadowblade') return { n: 5, ne: 4, nw: 4 }
  if (hero === 'spirit-summoner') return { n: 4, ne: 5 }
  if (hero === 'crimson-paladin') return { n: 4 }
  return {}
}

/** Northern evidence is independent of the legacy four-direction gate. */
export function assessHeroNorthernRunCoverage(hero, draws) {
  const batches = heroNorthernRunBatches(hero)
  const directions = Object.keys(batches)
  const counts = {}
  for (const direction of directions) {
    const cells = new Set()
    const expected = `/src/assets/es2/production/heroes/${hero}/candidates/${direction}-2026-11-24-batch-${batches[direction]}/run-${direction}-4frames@3x.webp`
    for (const { src, sx, sy, sw, sh, mirrored } of draws) {
      let pathname
      try { pathname = new URL(src).pathname } catch { continue }
      if (pathname !== expected || mirrored || sw !== 768 || sh !== 768 ||
        ![0, 768].includes(sx) || ![0, 768].includes(sy)) continue
      cells.add(`${sx}:${sy}`)
    }
    counts[direction] = cells.size
  }
  return { counts, complete: directions.length > 0 && directions.every(direction => counts[direction] === 4) }
}
