import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import type { FactionRuntime } from '../../content/enemies/runtime'
import type { GameState } from '../../types'
import { WORLD_ART } from './production-world'
import { drawFactionTelegraphs } from '../../content/enemies/telegraphs'
import type { Ctx2D } from '../ctx'

export type FactionArtwork = Record<FactionKind, { body: HTMLImageElement; telegraph: HTMLImageElement }>

/** One decode per art asset on game mount, no new Image allocations in the rAF loop. */
export function loadProductionFactionArt(makeImage: () => HTMLImageElement = () => new Image()): FactionArtwork {
  const out = {} as FactionArtwork
  for (const kind of Object.keys(ENEMY_DEFINITIONS) as FactionKind[]) {
    const body = makeImage()
    const telegraph = makeImage()
    body.src = WORLD_ART.enemies[kind].body
    telegraph.src = WORLD_ART.enemies[kind].telegraph
    out[kind] = { body, telegraph }
  }
  return out
}

const ready = (image: HTMLImageElement | undefined, width: number, height: number): image is HTMLImageElement =>
  !!image?.complete && image.naturalWidth === width && image.naturalHeight === height

/**
 * Visible-only rendering of authoritative faction runtime actors. All gameplay
 * physics/collisions/HP/telegraphs stay in the existing faction simulation.
 * six 96px source slots are independently padded and validated by asset TDD.
 */
export function drawLiveFactionArt(
  ctx: Ctx2D, state: GameState, runtime: FactionRuntime, images: Partial<FactionArtwork>,
  ox: number, oy: number,
): number {
  // Original warning geometries, tied to true aim/radius, are painted first.
  drawFactionTelegraphs(ctx, runtime, ox, oy)
  let drawn = 0
  const width = state.W, height = state.H
  for (const enemy of runtime.enemies) {
    if (enemy.hp <= 0) continue
    const x = enemy.x + ox, y = enemy.y + oy
    if (x < -110 || y < -170 || x > width + 110 || y > height + 90) continue
    const pair = images[enemy.kind]
    const body = pair?.body
    if (!ready(body, 576, 96)) continue
    const frame = enemy.state === 'phase' ? 5
      : enemy.state === 'windup' ? 2
        : enemy.state === 'attack' ? 3
          : enemy.state === 'recover' ? 4
            : (Math.floor(state.worldClock * 6 + enemy.id) & 1)
    const size = Math.max(70, enemy.radius * 4)
    const h = size * 1.08
    ctx.save()
    ctx.translate(x, y)
    // These 6-frame strips share one artist-authored facing. This mirroring is
    // separate from the 8-direction hero atlas, which must NEVER be mirrored.
    if (enemy.facingX < 0) ctx.scale(-1, 1)
    ctx.drawImage(body, frame * 96, 0, 96, 96, -size / 2, -h + 5, size, h)
    if (enemy.state === 'windup' && pair && ready(pair.telegraph, 96, 96)) {
      // Decorative cue only; the true world-sized hitbox is drawn above.
      ctx.drawImage(pair.telegraph, 0, 0, 96, 96, -20, -h - 18, 40, 40)
    }
    ctx.restore()
    drawn++
  }
  return drawn
}

/** Renderer-only projectiles; no changes to collision, damage or simulation. */
export function drawLiveFactionProjectiles(
  ctx: Ctx2D, state: GameState, runtime: FactionRuntime, ox: number, oy: number,
): void {
  for (const shot of runtime.projectiles) {
    const x = shot.x + ox, y = shot.y + oy
    if (x < -32 || y < -32 || x > state.W + 32 || y > state.H + 32) continue
    ctx.save()
    ctx.fillStyle = ENEMY_DEFINITIONS[shot.kind].telegraphColor
    ctx.beginPath()
    ctx.arc(x, y, shot.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
