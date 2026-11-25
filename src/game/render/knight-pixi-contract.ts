import type { Hero } from '../types'
import type { HeroAnimation } from './animation'
import type { Ctx2D } from './ctx'

/** DEV-only actor compositor, called at the existing y-sorted draw position. */
export interface HeroRigRenderer {
  draw(ctx: Ctx2D, hero: Hero, anim: HeroAnimation, clock: number, frozen: boolean, reduceFlashing?: boolean): boolean
  dispose(): void
}

export type KnightPixiRenderer = HeroRigRenderer
