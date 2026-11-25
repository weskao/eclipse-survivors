const clamp = n => Math.max(0, Math.min(1, n))
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t) }
const influence = (u, v, x) => (1 - smooth(Math.abs(u - x) / .26)) * (1 - smooth(Math.abs(v - .5) / .35))

// Precompute immutable weights in game pixels; never accumulate displacement.
export function createSkin(rest, width, height) {
  const weights = new Float32Array(rest.length / 2 * 4)
  for (let i = 0; i < rest.length; i += 2) {
    const u = rest[i] / width, v = rest[i + 1] / height, j = i * 2
    weights[j] = influence(u, v, .22)
    weights[j + 1] = influence(u, v, .78)
    weights[j + 2] = smooth((v - .60) / .35) * (1 - 2 * u)
    weights[j + 3] = smooth((v - .12) / .25) * (1 - smooth((v - .55) / .38))
  }
  return { rest: rest.slice(), weights }
}

export function deformBody({ rest, weights }, output, sample) {
  if (sample.reducedMotion) { output.set(rest); return }
  const p = clamp(sample.phase), wave = Math.sin(p * Math.PI * 2)
  const stride = sample.pose === 'run' ? Math.sin(sample.step) * clamp(sample.move) : 0
  const lean = sample.pose === 'dash' ? 5 * (1 - p) : sample.pose === 'hurt' ? -4 * (1 - p) : 0
  const breath = sample.pose === 'idle' ? wave * .5 : 0
  for (let i = 0; i < rest.length; i += 2) {
    const j = i * 2, main = weights[j], support = weights[j + 1], legs = weights[j + 2], torso = weights[j + 3]
    output[i] = rest[i] + main * sample.handX + support * sample.supportX + legs * stride * 4.3 + torso * lean
    output[i + 1] = rest[i + 1] + main * sample.handY + support * sample.supportY + legs * stride * 3.2 - torso * breath
  }
}

export function rigidSword(sourceWidth, sourceHeight, height, grip, width, dx, dy, rotation) {
  if (sourceWidth <= 0 || sourceHeight <= 0) throw new RangeError('Invalid sword texture')
  return { scale: height / sourceHeight, x: width * (grip[0] - .5) + dx, y: height * (grip[1] - 1) + 4 + dy, rotation }
}
