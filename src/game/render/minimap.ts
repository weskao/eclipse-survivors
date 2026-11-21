import { TAU } from '../constants'
import type { Artwork } from '../art'
import type { GameState } from '../types'
import type { Ctx2D } from './ctx'
import { biomePalette, hazardPhase, nearbyHazards, nearbyObstacles } from '../world'

/** Original `drawMiniMap` body, drawn onto the 152x110 minimap canvas context. */
export function drawMiniMap(p: Ctx2D, s: GameState, art: Artwork): void {
  const hero = s.hero
  if (!hero) return
  p.clearRect(0, 0, 152, 110)
  p.fillStyle = (biomePalette[s.currentScene] ?? biomePalette[0]!).minimap
  p.fillRect(0, 0, 152, 110)
  const tex = art.courtyard
  if (s.currentScene === 0 && tex.complete && tex.naturalWidth) {
    p.globalAlpha = 0.4
    p.drawImage(tex, 0, 0, 152, 110)
    p.globalAlpha = 1
  }
  const scale = 0.078
  for (const o of nearbyObstacles(s.currentScene, hero.x, hero.y, 1050)) {
    const x = 76 + (o.x - hero.x) * scale
    const y = 55 + (o.y - hero.y) * scale
    if (x < 3 || x > 149 || y < 3 || y > 107) continue
    p.fillStyle = '#abb4ac80'; p.fillRect(x - 2, y - 2, 4, 4)
  }
  for (const h of nearbyHazards(s.currentScene, hero.x, hero.y, 1050)) {
    const x = 76 + (h.x - hero.x) * scale
    const y = 55 + (h.y - hero.y) * scale
    if (x < 3 || x > 149 || y < 3 || y > 107) continue
    p.strokeStyle = hazardPhase(s.currentScene, h, s.worldClock) === 'active' ? '#ffd08b' : '#ffca7660'
    p.strokeRect(x - 3, y - 3, 6, 6)
  }
  const icons = { chest: '◆', shrine: '✦', invasion: '!', blessing: '+', bargain: '◈', challenge: '◎' }
  p.font = 'bold 12px sans-serif'; p.textAlign = 'center'
  for (const e of s.events) {
    const x = 76 + (e.x - hero.x) * scale
    const y = 55 + (e.y - hero.y) * scale
    if (x < 5 || x > 147 || y < 5 || y > 105) continue
    p.fillStyle = e.kind === 'invasion' ? '#ff8b8b' : '#ffe4a8'
    p.fillText(icons[e.kind], x, y + 4)
  }
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
