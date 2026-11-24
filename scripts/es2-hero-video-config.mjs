/** Keep unapproved candidate footage visibly separate from the release build. */
export function heroVideoCaptureConfig(baseUrl, candidateQA = false) {
  const url = new URL(baseUrl)
  if (candidateQA) url.searchParams.set('es2HeroArtQA', '1')
  return {
    url: url.toString(),
    output: candidateQA ? 'artifacts/es2-hero-video/candidate-qa' : 'artifacts/es2-hero-video',
    status: candidateQA ? 'QA_PENDING' : 'production',
  }
}

/** Verify actual candidate Canvas drawing, not merely a candidate image URL load. */
export function assessHeroCandidateCoverage(hero, draws) {
  const frames = { E: new Set(), S: new Set() }
  for (const { src, sx, sy, sw, sh } of draws) {
    for (const [direction, name, size] of [
      ['E', 'east', 704], ['S', 'south', 768],
    ]) {
      // Match the actual image pathname; a query parameter or unrelated path is not Canvas evidence.
      let pathname
      try { pathname = new URL(src).pathname } catch { continue }
      const folder = direction === 'S'
        ? hero === 'spirit-summoner' ? 'south-2026-11-24-mist-repair' : 'south-2026-11-24-batch-2'
        : 'east-2026-11-23'
      const expected = `/src/assets/es2/production/heroes/${hero}/candidates/${folder}/run-${name}-4frames@3x.webp`
      if (pathname !== expected) continue
      if (sw !== size || sh !== size || ![0, size].includes(sx) || ![0, size].includes(sy)) continue
      frames[direction].add(`${sx}:${sy}`)
    }
  }
  return {
    eastRunFrames: frames.E.size,
    southRunFrames: frames.S.size,
    hasBothDirections: frames.E.size >= 2 && frames.S.size >= 2,
  }
}
