/** The 2D-context surface the renderer touches; the real context and test fakes both satisfy it. */
export type Ctx2D = Pick<
  CanvasRenderingContext2D,
  | 'save' | 'restore' | 'translate' | 'rotate' | 'scale' | 'setTransform' | 'setLineDash'
  | 'drawImage' | 'fillRect' | 'strokeRect' | 'clearRect' | 'fillText' | 'strokeText'
  | 'beginPath' | 'closePath' | 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'arc' | 'ellipse' | 'fill' | 'stroke'
  | 'createLinearGradient' | 'createRadialGradient'
  | 'fillStyle' | 'strokeStyle' | 'lineWidth' | 'lineCap' | 'lineJoin' | 'globalAlpha'
  | 'shadowBlur' | 'shadowColor' | 'textAlign' | 'font' | 'filter'
>
