import type { ContentEffectDefinition } from '../contracts'
import type { ContentId, ContentVisualFx, GameState, SfxCue } from '../../types'
import type { Ctx2D } from '../../render/ctx'
import { EVOLUTION2_RECIPES } from './recipes'

export interface Evolution2Cue {
  readonly effectId: ContentId
  readonly sound: SfxCue
  readonly color: string
  readonly radius: number
}

/** These cues use the existing audio mixer and bounded ContentVisualFx pipeline. */
export const EVOLUTION2_CUES: Readonly<Record<ContentId, Evolution2Cue>> =
  Object.freeze(Object.fromEntries(EVOLUTION2_RECIPES.map(recipe => [
    recipe.id, Object.freeze({
      effectId: `evolution2:${recipe.id.slice('evolution2:'.length)}-fx` as ContentId,
      sound: recipe.sound, color: recipe.color, radius: recipe.radius,
    }),
  ] as const)) as Record<ContentId, Evolution2Cue>)

function makeEffect(title: string, cue: Evolution2Cue, index: number): ContentEffectDefinition {
  // Immutable spoke geometry is computed once, not inside every Canvas frame.
  const spokeCount = 4 + index % 5
  const directions = Array.from({ length: spokeCount }, (_, i) => {
    const angle = i * Math.PI * 2 / spokeCount
    return { x: Math.cos(angle), y: Math.sin(angle) }
  })
  return {
    id: cue.effectId,
    title,
    draw(ctx: Ctx2D, _state: GameState, effect: ContentVisualFx, ox: number, oy: number): void {
      const progress = 1 - effect.life / effect.max
      const radius = Math.min(110, cue.radius * 0.35) * (0.45 + progress * 0.55)
      const x = effect.x - ox, y = effect.y - oy
      ctx.globalAlpha = Math.max(0, (1 - progress) * 0.8)
      ctx.strokeStyle = cue.color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      for (const direction of directions) {
        ctx.moveTo(x + direction.x * radius * 0.74, y + direction.y * radius * 0.74)
        ctx.lineTo(x + direction.x * radius * 1.18, y + direction.y * radius * 1.18)
      }
      ctx.stroke()
    },
  }
}

export const EVOLUTION2_EFFECTS: readonly ContentEffectDefinition[] =
  EVOLUTION2_RECIPES.map((recipe, index) => makeEffect(
    `${recipe.title} effect`, EVOLUTION2_CUES[recipe.id]!, index,
  ))
