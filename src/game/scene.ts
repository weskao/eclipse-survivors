// Scene (weather/location) progression, original setScene + the scene check in update().
import { SCENES, SCENE_SECONDS } from './constants'
import { impact } from './fx'
import { rand, random } from './math'
import type { GameHooks, GameState } from './types'

const IMPACT_COLORS = ['#ffd39a', '#93c5ff', '#d8efff', '#ffb775']
const SPARK_COLORS = ['#ffd992', '#84caff', '#dff3ff', '#ffab64']

export const sceneIndexAt = (time: number): number => Math.min(SCENES.length - 1, Math.floor(time / SCENE_SECONDS))

export function setScene(s: GameState, index: number, announce: boolean, hooks: GameHooks): void {
  index = Math.max(0, Math.min(SCENES.length - 1, index))
  if (index === s.currentScene && announce) return
  s.currentScene = index
  s.events = []
  s.nextEventAt = s.time + 6
  s.sceneEnteredAt = s.time
  s.challengeUntil = 0
  s.challengePoint = null
  s.hazardLastHitAt = -Infinity
  hooks.content?.(s, { type: 'scene-change', index })
  const hero = s.hero
  if (!announce || !hero) return
  const scene = SCENES[index]!
  hooks.sfx('scene')
  hooks.message(`✦ 場景轉換：${scene.name} · ${scene.label}`)
  impact(s, hero.x, hero.y, 95, IMPACT_COLORS[index] ?? '#ffd39a', 1.2)
  for (let i = 0; i < 24; i++) {
    s.fx.push({
      x: hero.x + rand(-40, 40), y: hero.y + rand(-36, 28), vx: rand(-20, 20), vy: rand(-80, -5),
      life: 0.8, max: 0.8, color: SPARK_COLORS[index] ?? '#ffd992', r: 2 + random() * 4, type: 'spark',
    })
  }
}
