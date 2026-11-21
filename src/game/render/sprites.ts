import { JOB_IDS, TAU } from '../constants'
import type { JobId } from '../types'
import type { Ctx2D } from './ctx'

/** Creates a blank canvas of the given size (injected so tests need no DOM canvas). */
export type MakeCanvas = (w: number, h: number) => HTMLCanvasElement
export interface Props { tree: HTMLCanvasElement; ruin: HTMLCanvasElement; crystal: HTMLCanvasElement }

export const domCanvas: MakeCanvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

type Ell = (x: number, y: number, rx: number, ry: number, col: string) => void
type Line = (pts: [number, number][], col: string, w: number) => void
type Paint = (p: Ctx2D, e: Ell, l: Line) => void

function buildSprite(make: MakeCanvas, sprites: Record<string, HTMLCanvasElement>, name: string, paint: Paint): void {
  const x = make(120, 144)
  const p = x.getContext('2d')
  if (!p) return
  const ell: Ell = (cx, cy, rx, ry, col) => {
    p.fillStyle = col
    p.beginPath()
    p.ellipse(cx, cy, rx, ry, 0, 0, TAU)
    p.fill()
  }
  const line: Line = (pts, col, w) => {
    p.strokeStyle = col
    p.lineWidth = w
    p.lineCap = 'round'
    p.lineJoin = 'round'
    p.beginPath()
    pts.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py)))
    p.stroke()
  }
  paint(p, ell, line)
  sprites[name] = x
}

const COAT: Record<JobId, string> = { knight: '#557fcb', ranger: '#359d82', wizard: '#9d72d0' }
const HAT: Record<JobId, string> = { knight: '#637ab4', ranger: '#207459', wizard: '#6144a0' }

/** Original `buildSprites`: flat-shaded fallbacks used until the webp artwork has decoded. */
export function buildSprites(make: MakeCanvas): Record<string, HTMLCanvasElement> {
  const sprites: Record<string, HTMLCanvasElement> = {}
  for (const j of JOB_IDS) {
    buildSprite(make, sprites, j, (p, e, l) => {
      const coat = COAT[j]
      const hat = HAT[j]
      e(46, 112, 12, 14, '#3a364c'); e(75, 112, 12, 14, '#3a364c'); e(60, 91, 27, 29, '#243e55')
      e(60, 80, 25, 31, coat); e(46, 78, 9, 19, coat); e(75, 78, 9, 19, coat)
      e(60, 52, 22, 23, '#ffdaa9'); e(52, 54, 2.6, 3, '#443334'); e(68, 54, 2.6, 3, '#443334'); e(59, 65, 5, 2, '#b56d62')
      e(60, 36, 24, 15, hat); e(40, 48, 8, 12, hat); e(80, 47, 8, 12, hat)
      if (j === 'knight') {
        e(60, 85, 12, 15, '#c0dbee'); l([[89, 97], [96, 35]], '#dbeefe', 8); l([[84, 82], [102, 82]], '#f2cd7c', 5); e(60, 30, 18, 7, '#d9eaf1')
      }
      if (j === 'ranger') {
        e(59, 26, 24, 11, '#2b7453'); l([[90, 46], [105, 76], [90, 103]], '#ebc27d', 5); l([[90, 46], [90, 103]], '#f7eee0', 1.5); e(60, 84, 7, 9, '#eddb83')
      }
      if (j === 'wizard') {
        l([[88, 111], [92, 34]], '#e1c18c', 6); e(92, 32, 10, 10, '#93edff'); e(60, 27, 29, 9, '#b68be2')
        l([[38, 25], [61, 0], [84, 25]], '#7c56ac', 10); e(60, 82, 8, 9, '#e9d1ff')
      }
      p.strokeStyle = '#193d49'
      p.lineWidth = 2
      p.beginPath()
      p.ellipse(60, 82, 26, 31, 0, 0, TAU)
      p.stroke()
    })
  }
  buildSprite(make, sprites, 'slime', (_p, e) => {
    e(60, 88, 39, 35, '#247e83'); e(60, 81, 37, 34, '#54dcb9'); e(50, 64, 24, 12, '#b3fff2')
    e(46, 90, 5, 7, '#143f54'); e(75, 90, 5, 7, '#143f54'); e(62, 104, 11, 3, '#217e76'); e(46, 88, 2, 2, 'white'); e(74, 88, 2, 2, 'white')
  })
  buildSprite(make, sprites, 'bat', (p, e, l) => {
    p.fillStyle = '#625484'
    p.beginPath()
    p.moveTo(60, 70); p.lineTo(13, 41); p.lineTo(20, 98); p.lineTo(42, 83); p.lineTo(60, 95); p.lineTo(78, 83); p.lineTo(100, 98); p.lineTo(107, 41)
    p.closePath()
    p.fill()
    e(60, 75, 24, 29, '#aa8ac5'); e(52, 74, 4, 5, '#f7c6e0'); e(69, 74, 4, 5, '#f7c6e0')
    l([[47, 53], [41, 40], [56, 50]], '#d5b1ee', 4); l([[73, 53], [79, 40], [64, 50]], '#d5b1ee', 4)
  })
  buildSprite(make, sprites, 'goblin', (_p, e, l) => {
    e(60, 96, 27, 27, '#8a6549'); e(60, 64, 30, 27, '#b4c47c'); e(34, 62, 14, 11, '#98b76b'); e(86, 62, 14, 11, '#98b76b')
    e(48, 66, 5, 5, '#492d3c'); e(72, 66, 5, 5, '#492d3c'); e(59, 84, 12, 3, '#633e31'); e(60, 37, 24, 12, '#876943')
    l([[92, 110], [103, 63]], '#786348', 5)
  })
  buildSprite(make, sprites, 'boss', (_p, e, l) => {
    e(60, 99, 49, 42, '#713d75'); e(60, 67, 47, 42, '#b55d85'); e(35, 46, 18, 24, '#ffe0a4'); e(85, 46, 18, 24, '#ffe0a4')
    e(60, 65, 31, 30, '#7d4b70'); e(45, 68, 8, 9, '#ffe4a0'); e(75, 68, 8, 9, '#ffe4a0'); e(60, 93, 22, 9, '#362b47')
    for (let i = 0; i < 4; i++) e(46 + i * 9, 95, 3, 5, '#fff0dc')
    l([[21, 96], [4, 122]], '#693656', 13); l([[100, 96], [116, 122]], '#693656', 13)
  })
  buildSprite(make, sprites, 'tree', (_p, e, l) => {
    e(60, 113, 14, 29, '#765744'); e(42, 80, 33, 27, '#276d5a'); e(78, 66, 33, 32, '#317963'); e(53, 47, 34, 33, '#478f69')
    e(75, 92, 36, 24, '#348568'); e(44, 42, 13, 9, '#8dbb76'); e(87, 59, 11, 7, '#8ebc7f'); l([[62, 109], [62, 89]], '#a57954', 5)
  })
  buildSprite(make, sprites, 'rock', (_p, e) => {
    e(60, 102, 36, 17, '#536d75'); e(60, 93, 31, 18, '#aabec1'); e(48, 85, 13, 6, '#e1ece3')
  })
  return sprites
}
