import type { AtlasFindings } from './frame-qa'

export interface QaAsset {
  path: string
  frameWidth: number
  frameHeight: number
  native3x?: boolean
  status: string
}

/** Only image provenance comes from source metadata; visual approval is a separate gate. */
export function buildEnemyQaFinding(
  kind: string, displayPx: number, body: QaAsset, cue: QaAsset,
  bodyQa: AtlasFindings, cueQa: AtlasFindings,
) {
  const bodyNative3x = body.native3x === true &&
    body.frameWidth >= displayPx * 3 && body.frameHeight >= displayPx * 3
  const cueNative3x = cue.native3x === true && cue.frameWidth >= 120 && cue.frameHeight >= 120
  return {
    kind, source: body.path, displayedPx: displayPx, minimumNative3xPx: displayPx * 3,
    actualSourcePx: body.frameWidth, bodyNative3x, cueNative3x,
    native3x: bodyNative3x && cueNative3x,
    bodyQa, cueQa,
    humanApproval: body.status === 'approved' && cue.status === 'approved' ? 'approved' : 'pending',
  }
}
