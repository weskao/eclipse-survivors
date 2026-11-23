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

const productionArt = import.meta.glob('../../../assets/es2/production/evolutions/*@3x.webp', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

type ImageFactory = () => HTMLImageElement

function makeEffect(
  title: string, cue: Evolution2Cue, index: number,
  artwork: (id: ContentId) => HTMLImageElement | undefined,
): ContentEffectDefinition {
  // Immutable spoke geometry is computed once, not inside every Canvas frame.
  const spokeCount = 4 + index % 5
  const directions = Array.from({ length: spokeCount }, (_, i) => {
    const angle = i * Math.PI * 2 / spokeCount
    return { x: Math.cos(angle), y: Math.sin(angle) }
  })
  return {
    id: cue.effectId,
    title,
    draw(ctx: Ctx2D, state: GameState, effect: ContentVisualFx, ox: number, oy: number): void {
      if (effect.max <= 0 || effect.life <= 0) return
      const progress = Math.max(0, Math.min(1, 1 - effect.life / effect.max))
      const radius = Math.min(110, cue.radius * 0.35) * (0.45 + progress * 0.55)
      // World-to-screen offset is additive, as in the other combat effect renderers.
      const x = effect.x + ox, y = effect.y + oy
      const margin = 150
      if (state.W > 0 && state.H > 0 &&
          (x < -margin || y < -margin || x > state.W + margin || y > state.H + margin)) return
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
      // Distinct 3x skill paintings make the twelve abilities recognizable in
      // battle; retain the existing range glyph as the world-space telegraph.
      const image = artwork(cue.effectId)
      if (image?.complete && image.naturalWidth > 0) {
        const size = Math.min(128, Math.max(68, radius * 1.5))
        ctx.globalAlpha = Math.max(0, (1 - progress) * 0.82)
        ctx.drawImage(image, x - size / 2, y - size / 2, size, size)
      }
    },
  }
}

/** Load each of the twelve approved illustrations only when its first visible cast occurs. */
export function createEvolutionCueEffects(makeImage: ImageFactory = () => new Image()): ContentEffectDefinition[] {
  const images = new Map<ContentId, HTMLImageElement>()
  const artwork = (id: ContentId): HTMLImageElement | undefined => {
    const existing = images.get(id)
    if (existing) return existing
    const idPart = id.slice('evolution2:'.length, -'-fx'.length)
    const url = productionArt[`../../../assets/es2/production/evolutions/${idPart}@3x.webp`]
    if (!url) return undefined
    const image = makeImage()
    image.src = url
    images.set(id, image)
    return image
  }
  return EVOLUTION2_RECIPES.map((recipe, index) => makeEffect(
    `${recipe.title} effect`, EVOLUTION2_CUES[recipe.id]!, index, artwork,
  ))
}

export const EVOLUTION2_EFFECTS: readonly ContentEffectDefinition[] = createEvolutionCueEffects()
