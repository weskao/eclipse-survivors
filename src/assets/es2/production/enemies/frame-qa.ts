/** Read-only, per-load QA of actual decoded WebP pixels, never used in the animation loop. */
export interface AtlasFindings {
  duplicatePairs: number[][]
  borderRiskFrames: number[]
  blankFrames: number[]
}

export function inspectAtlasPixels(
  pixels: Uint8ClampedArray, width: number, height: number, frameSide: number, frames: number,
): AtlasFindings {
  if (!Number.isInteger(frameSide) || frameSide <= 0 || !Number.isInteger(frames) || frames <= 0 ||
      width !== frameSide * frames || height !== frameSide) {
    throw new Error('Invalid atlas dimensions or source frame geometry')
  }
  if (pixels.length !== width * height * 4) throw new Error('Invalid pixel buffer length')

  const duplicatePairs: number[][] = []
  const borderRiskFrames: number[] = []
  const blankFrames: number[] = []
  for (let frame = 0; frame < frames; frame++) {
    let nonempty = false
    let touchesBorder = false
    let equalsPrevious = frame > 0
    for (let y = 0; y < frameSide; y++) {
      for (let x = 0; x < frameSide; x++) {
        const pos = (y * width + frame * frameSide + x) * 4
        if (pixels[pos + 3] !== 0) {
          nonempty = true
          if (x === 0 || x === frameSide - 1 || y === 0 || y === frameSide - 1) touchesBorder = true
        }
        if (equalsPrevious) {
          const prior = pos - frameSide * 4
          if (pixels[pos] !== pixels[prior] || pixels[pos + 1] !== pixels[prior + 1] ||
              pixels[pos + 2] !== pixels[prior + 2] || pixels[pos + 3] !== pixels[prior + 3]) {
            equalsPrevious = false
          }
        }
      }
    }
    if (!nonempty) blankFrames.push(frame)
    if (touchesBorder) borderRiskFrames.push(frame)
    if (equalsPrevious) duplicatePairs.push([frame - 1, frame])
  }
  return { duplicatePairs, borderRiskFrames, blankFrames }
}
