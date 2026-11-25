import type { Hero } from '../types'
import type { HeroAnimation } from './animation'
import type { Ctx2D } from './ctx'

/** DEV-only actor compositor, called at the existing y-sorted draw position. */
export interface KnightPixiRenderer {
  draw(ctx: Ctx2D, hero: Hero, anim: HeroAnimation, clock: number, frozen: boolean): boolean
  dispose(): void
}
