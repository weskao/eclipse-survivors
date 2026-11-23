import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import type { FactionRuntime } from '../../content/enemies/runtime'
import type { GameState } from '../../types'
import { WORLD_ART } from './production-world'
import { drawFactionTelegraphs } from '../../content/enemies/telegraphs'
import type { Ctx2D } from '../ctx'
import { drawProjectileSprite, type ProjectileSprites, type ProjectileArtId } from '../projectile-art'

export type FactionArtwork = Record<FactionKind, { body: HTMLImageElement; telegraph: HTMLImageElement }>

/** Visual-only sizes, calibrated against legacy develop mobs (87–139px wide).
 * Do not reuse gameplay collision radii: new art must be tuned independently.
 * Atlases remain square and their source rectangles are unchanged. */
export const FACTION_VISUAL_SIZE: Readonly<Record<FactionKind, number>> = {
  'shadow-assassin': 92,
  necromancer: 108,
  'dark-archer': 96,
  'plague-carrier': 104,
  'shield-guardian': 128,
  phantom: 90,
  'fire-imp': 88,
  'frost-wraith': 102,
  berserker: 110,
  'crystal-sentinel': 128,
}


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

const ready = (image: HTMLImageElement | undefined, columns = 1): image is HTMLImageElement =>
  !!image?.complete && image.naturalHeight >= 96 && image.naturalWidth === image.naturalHeight * columns

/**
 * Visible-only rendering of authoritative faction runtime actors. All gameplay
 * physics/collisions/HP/telegraphs stay in the existing faction simulation.
 * six square source slots (legacy 96px or authored 3x) are validated before drawing.
 */
export function drawLiveFactionArt(
  ctx: Ctx2D, state: GameState, runtime: FactionRuntime, images: Partial<FactionArtwork>,
  ox: number, oy: number,
): number {
  // Original warning geometries, tied to true aim/radius, are painted first.
  drawFactionTelegraphs(ctx as CanvasRenderingContext2D, runtime, ox, oy)
  let drawn = 0
  const width = state.W, height = state.H
  for (const enemy of runtime.enemies) {
    if (enemy.hp <= 0) continue
    const x = enemy.x + ox, y = enemy.y + oy
    if (x < -110 || y < -170 || x > width + 110 || y > height + 90) continue
    const pair = images[enemy.kind]
    const body = pair?.body
    if (!ready(body, 6)) continue
    const frame = enemy.state === 'phase' ? 5
      : enemy.state === 'windup' ? 2
        : enemy.state === 'attack' ? 3
          : enemy.state === 'recover' ? 4
            : (Math.floor(state.worldClock * 6 + enemy.id) & 1)
    const size = FACTION_VISUAL_SIZE[enemy.kind]
    const h = size // Preserve square source-cell proportions and the existing feet anchor.
    ctx.save()
    ctx.translate(x, y)
    // These 6-frame strips share one artist-authored facing. This mirroring is
    // separate from the 8-direction hero atlas, which must NEVER be mirrored.
    if (enemy.facingX < 0) ctx.scale(-1, 1)
    const sourceSide = body.naturalHeight
    ctx.drawImage(body, frame * sourceSide, 0, sourceSide, sourceSide, -size / 2, -h + 5, size, h)
    if (enemy.state === 'windup' && pair && ready(pair.telegraph)) {
      // Decorative cue only; the true world-sized hitbox is drawn above.
      ctx.drawImage(pair.telegraph, 0, 0, pair.telegraph.naturalWidth, pair.telegraph.naturalHeight, -20, -h - 18, 40, 40)
    }
    ctx.restore()
    drawn++
  }
  return drawn
}

/** Renderer-only projectiles; no changes to collision, damage or simulation. */
export function drawLiveFactionProjectiles(
  ctx: Ctx2D, state: GameState, runtime: FactionRuntime, ox: number, oy: number,
  sprites?: Partial<ProjectileSprites>,
): void {
  for (const shot of runtime.projectiles) {
    const x = shot.x + ox, y = shot.y + oy
    if (x < -48 || y < -48 || x > state.W + 48 || y > state.H + 48) continue
    const art: ProjectileArtId = shot.kind === 'fire-imp' ? 'enemy-ember'
      : shot.kind === 'dark-archer' ? 'spectral-arrow'
        : shot.kind === 'frost-wraith' || shot.kind === 'crystal-sentinel' ? 'arcane-bolt' : 'enemy-hex'
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.atan2(shot.vy, shot.vx))
    const drawn = drawProjectileSprite(ctx, sprites, art, Math.max(34, shot.radius * 3.1))
    ctx.restore()
    if (drawn) continue
    ctx.save()
    ctx.fillStyle = ENEMY_DEFINITIONS[shot.kind].telegraphColor
    ctx.beginPath()
    ctx.arc(x, y, shot.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
