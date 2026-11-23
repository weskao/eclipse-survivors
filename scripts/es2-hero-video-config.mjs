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
