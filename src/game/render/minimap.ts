import { TAU } from '../constants'
import type { Artwork } from '../art'
import type { GameState } from '../types'
import type { Ctx2D } from './ctx'

/** Original `drawMiniMap` body, drawn onto the 152x110 minimap canvas context. */
export function drawMiniMap(p: Ctx2D, s: GameState, art: Artwork): void {
  const hero = s.hero
  if (!hero) return
  p.clearRect(0, 0, 152, 110)
  p.fillStyle = '#17231f'
  p.fillRect(0, 0, 152, 110)
  const tex = art.courtyard
  if (tex.complete && tex.naturalWidth) {
    p.globalAlpha = 0.4
    p.drawImage(tex, 0, 0, 152, 110)
    p.globalAlpha = 1
  }
  const scale = 0.078
  for (const e of s.mobs) {
    const x = 76 + (e.x - hero.x) * scale
    const y = 55 + (e.y - hero.y) * scale
    if (x < 4 || x > 148 || y < 4 || y > 106) continue
    p.fillStyle = e.type === 'boss' ? '#f1b47e' : '#eb8179'
    p.beginPath(); p.arc(x, y, e.type === 'boss' ? 4 : 1.6, 0, TAU); p.fill()
  }
  p.fillStyle = '#fff0b5'
  p.beginPath(); p.moveTo(76, 49); p.lineTo(71, 60); p.lineTo(81, 60); p.closePath(); p.fill()
  p.strokeStyle = '#eac79a70'
  p.strokeRect(1, 1, 150, 108)
}
