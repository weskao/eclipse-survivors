// Test doubles for the renderer: a recording 2D context and fake artwork / canvases.
import type { Artwork } from '../art'
import type { Ctx2D } from './ctx'

export interface FakeCtx {
  ctx: Ctx2D
  calls: string[]
  /** First argument of every drawImage call, in order. */
  drawn: unknown[]
}

export function createFakeCtx(): FakeCtx {
  const calls: string[] = []
  const drawn: unknown[] = []
  const note = (name: string) => (..._args: unknown[]): void => {
    calls.push(name)
  }
  const gradient = (): CanvasGradient => ({ addColorStop: () => {} })
  const ctx: Ctx2D = {
    save: note('save'), restore: note('restore'), translate: note('translate'), rotate: note('rotate'),
    scale: note('scale'), setTransform: note('setTransform'), setLineDash: note('setLineDash'),
    drawImage: (...args: unknown[]): void => {
      calls.push('drawImage')
      drawn.push(args[0])
    },
    fillRect: note('fillRect'), strokeRect: note('strokeRect'), clearRect: note('clearRect'),
    fillText: note('fillText'), strokeText: note('strokeText'),
    beginPath: note('beginPath'), closePath: note('closePath'), moveTo: note('moveTo'), lineTo: note('lineTo'),
    bezierCurveTo: note('bezierCurveTo'), arc: note('arc'), ellipse: note('ellipse'), fill: note('fill'),
    stroke: note('stroke'),
    createLinearGradient: gradient, createRadialGradient: gradient,
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', globalAlpha: 1,
    shadowBlur: 0, shadowColor: '', textAlign: 'start', font: '', filter: 'none',
  }
  return { ctx, calls, drawn }
}

export function fakeImage(ready: boolean): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, 'complete', { value: ready })
  Object.defineProperty(img, 'naturalWidth', { value: ready ? 1 : 0 })
  return img
}

export function fakeArtwork(ready: boolean): Artwork {
  const i = (): HTMLImageElement => fakeImage(ready)
  return {
    knight: i(), ranger: i(), wizard: i(), slime: i(), bat: i(), goblin: i(), golem: i(), boss: i(),
    ground: i(), courtyard: i(),
  }
}

/** Canvas factory whose canvases hand out recording contexts; `made` holds one entry per canvas. */
export function fakeCanvasFactory(): { make: (w: number, h: number) => HTMLCanvasElement; made: { canvas: HTMLCanvasElement; fake: FakeCtx }[] } {
  const made: { canvas: HTMLCanvasElement; fake: FakeCtx }[] = []
  const make = (w: number, h: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const fake = createFakeCtx()
    Object.defineProperty(canvas, 'getContext', { value: () => fake.ctx })
    made.push({ canvas, fake })
    return canvas
  }
  return { make, made }
}
