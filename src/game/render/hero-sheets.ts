import { TAU } from '../constants'
import { createHero } from '../state'
import type { Hero, JobId } from '../types'
import type { HeroAnimation } from './animation'
import { drawRigSprite } from './characters'
import type { Ctx2D } from './ctx'
import type { MakeCanvas } from './sprites'

type Source = HTMLImageElement | HTMLCanvasElement
type SequencePose = 'run' | 'attack' | 'cast'
interface Sheet { source: Source; image: HTMLCanvasElement }

/**
 * Bakes directional frame sequences from the original illustrated character and
 * its existing two-bone weapon rig. No texture slicing or inverse kinematics are
 * evaluated in the normal rendering loop once a sequence has been cached.
 *
 * Sheets are generated on first use, then reused. Eviction bounds memory during
 * long sessions, and an artwork change invalidates the corresponding sequence.
 */
export function createHeroSheets(makeCanvas: MakeCanvas): {
  draw(ctx: Ctx2D, source: Source, job: JobId, hero: Hero, anim: HeroAnimation, width: number, height: number): boolean
  readonly size: number
} {
  const cache = new Map<string, Sheet>()
  const maxSheets = 16

  return {
    get size() { return cache.size },
    draw(ctx, source, job, hero, anim, width, height) {
      if (anim.reducedMotion || (anim.pose !== 'run' && anim.pose !== 'attack' && anim.pose !== 'cast')) return false
      const pose: SequencePose = anim.pose
      const direction = anim.direction
      const angle = direction * TAU / 8
      // Vertical directions preserve the existing facing side to avoid sudden
      // left/right flips when travelling straight up or down.
      const facing: 1 | -1 = direction === 2 || direction === 6
        ? hero.face : direction > 2 && direction < 6 ? -1 : 1
      const key = job + ':' + pose + ':' + direction + ':' + facing + ':' + width + 'x' + height
      let item = cache.get(key)
      if (item && item.source !== source) {
        cache.delete(key)
        item = undefined
      }
      if (!item) {
        const sheet = makeCanvas(width * anim.count, height)
        const context = sheet.getContext('2d')
        if (!context) return false
        const model = createHero(job)
        model.aimAngle = angle
        model.face = facing
        model.moveAmount = 1
        for (let frame = 0; frame < anim.count; frame++) {
          const phase = frame / Math.max(1, anim.count - 1)
          model.step = pose === 'run' ? frame * TAU / anim.count : 0
          context.save()
          context.translate(width * (frame + 0.5), height - 4)
          if (facing < 0) context.scale(-1, 1)
          drawRigSprite(context, source, width, height, model, {
            pose, frame, count: anim.count, phase, direction, reducedMotion: false,
          }, job)
          context.restore()
        }
        item = { source, image: sheet }
      }
      // A tiny LRU; a full atlas for all three heroes would keep unused frames
      // resident on mobile indefinitely.
      cache.delete(key)
      cache.set(key, item)
      if (cache.size > maxSheets) cache.delete(cache.keys().next().value!)
      ctx.drawImage(item.image, Math.min(anim.frame, anim.count - 1) * width, 0, width, height,
        -width / 2, -height + 4, width, height)
      return true
    },
  }
}

export type HeroSheets = ReturnType<typeof createHeroSheets>
