/** Diagnostic wall-clock samples. These are not browser FPS estimates. */
export interface Percentiles {
  min: number
  median: number
  p95: number
  p99: number
  max: number
}

export function distribution(samples: readonly number[]): Percentiles {
  if (!samples.length || samples.some(value => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('Expected nonempty, finite nonnegative timing samples')
  }
  const ordered = [...samples].sort((a, b) => a - b)
  const at = (fraction: number): number => ordered[Math.ceil(fraction * ordered.length) - 1]!
  return { min: ordered[0]!, median: at(0.5), p95: at(0.95), p99: at(0.99), max: ordered[ordered.length - 1]! }
}

export function profileFrames(
  frames: number,
  work: (frame: number) => void,
  now: () => number = () => performance.now(),
): { samplesMs: number[]; summary: Percentiles } {
  if (!Number.isSafeInteger(frames) || frames < 1) throw new RangeError('Frame count must be a positive safe integer')
  const samplesMs: number[] = []
  for (let frame = 0; frame < frames; frame++) {
    const start = now()
    work(frame)
    const elapsed = now() - start
    if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('Clock must be finite and monotonic')
    samplesMs.push(elapsed)
  }
  return { samplesMs, summary: distribution(samplesMs) }
}
