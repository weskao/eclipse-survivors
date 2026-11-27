// Compare the candidate package version with the latest published GitHub Release.
const [, , previousTag, current] = process.argv
const parse = version => {
  const parts = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d?)$/.exec(version ?? '')
  if (!parts) throw new Error(`Invalid version ${version}; expected X.Y.Z with patch 0–99.`)
  return parts.slice(1).map(BigInt)
}

try {
  const previous = previousTag?.replace(/^v/, '')
  const [major, minor, patch] = parse(previous)
  parse(current)
  const next = patch === 99n ? `${major}.${minor + 1n}.0` : `${major}.${minor}.${patch + 1n}`
  if (current !== previous && current !== next) {
    throw new Error(`Expected ${next} for a new release (or ${previous} for a redeploy), got ${current}.`)
  }
  console.log(`Release version: ${previous} -> ${current} verified.`)
} catch (error) {
  console.error(`Release version: ${error.message}`)
  process.exitCode = 1
}
