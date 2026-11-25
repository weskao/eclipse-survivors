import { drawEnergyMissile } from '../energy-art'
import { applyEnemyPose, applyEnemyRecoil, enemyWeight } from '../enemy-motion'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import assassinMasterUrl from '../../../assets/es2/production/enemies/masters/shadow-assassin-6-poses-3x2-master-1536x1024.webp?url'
import frostWraithMasterUrl from '../../../assets/es2/production/enemies/masters/frost-wraith-6poses-3x2-master-1536x1024.png?url'
import type { FactionRuntime } from '../../content/enemies/runtime'
import type { GameState } from '../../types'
import { WORLD_ART } from './production-world'
import { drawFactionTelegraphs } from '../../content/enemies/telegraphs'
import type { Ctx2D } from '../ctx'
import { drawEnemyHealthBar, sampleHealthBar, shouldShowHealthBar, type HealthBarMotion, type HealthBarTarget } from '../health-bars'
import { type ProjectileSprites, type ProjectileArtId } from '../projectile-art'

export type FactionArtwork = Record<FactionKind, { body: HTMLImageElement; telegraph: HTMLImageElement; highResBody?: HTMLImageElement }>

/** Only existing authentic 512px 3×2 source grids: never upscale undersized strips. */
const NATIVE_MASTER_URLS: Partial<Record<FactionKind, string>> = {
  'shadow-assassin': assassinMasterUrl,
  'frost-wraith': frostWraithMasterUrl,
}

/** Visual-only dimensions in game px, independently calibrated against original mob / boss silhouettes.
 * Some native WebPs contain 25–35% transparent padding and looked too small at 88–128px.
 * The largest enemy is 198px, clearly below the enlarged 255px first-phase Boss. Physics is untouched.
 * Authored six-frame square source rectangles and world-space foot anchors remain unchanged. */
export const FACTION_VISUAL_SIZE: Readonly<Record<FactionKind, number>> = {
  'shadow-assassin': 146,
  necromancer: 168,
  'dark-archer': 154,
  'plague-carrier': 176,
  'shield-guardian': 198,
  phantom: 152,
  'fire-imp': 142,
  'frost-wraith': 166,
  berserker: 172,
  'crystal-sentinel': 198,
}

/** Bounds computed once rather than scanning sizes in the hot draw loop. */
/** One decode per art asset on game mount, no new Image allocations in the rAF loop. */
export function loadProductionFactionArt(makeImage: () => HTMLImageElement = () => new Image()): FactionArtwork {
  const out = {} as FactionArtwork
  for (const kind of Object.keys(ENEMY_DEFINITIONS) as FactionKind[]) {
    const body = makeImage()
    const telegraph = makeImage()
    body.src = WORLD_ART.enemies[kind].body
    telegraph.src = WORLD_ART.enemies[kind].telegraph
    const authoredMasterUrl = NATIVE_MASTER_URLS[kind]
    if (authoredMasterUrl) {
      // Existing 512px authored source, decoded once per renderer. No per-actor allocations.
      const highResBody = makeImage()
      highResBody.src = authoredMasterUrl
      out[kind] = { body, telegraph, highResBody }
    } else out[kind] = { body, telegraph }
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
  healthBars?: WeakMap<HealthBarTarget, HealthBarMotion>, reducedMotion = false, showFullHealthBars = false,
): number {
  // Original warning geometries, tied to true aim/radius, are painted first.
  drawFactionTelegraphs(ctx as CanvasRenderingContext2D, runtime, ox, oy, reducedMotion, state.W, state.H)
  let drawn = 0
  const width = state.W, height = state.H
  for (const enemy of runtime.enemies) {
    if (enemy.hp <= 0) continue
    const x = enemy.x + ox, y = enemy.y + oy
    const size = FACTION_VISUAL_SIZE[enemy.kind]
    const half = size / 2
    // One bounded test per visible actor: preserve telegraph decoration within 24px.
    // A shared max-size margin needlessly drew small enemies below the screen.
    if (x + half < -24 || x - half > width + 24 ||
        y + 5 < -24 || y - size + 5 > height + 24) continue
    const pair = images[enemy.kind]
    const body = pair?.body
    const master = pair?.highResBody
    const masterReady = !!master?.complete && master.naturalWidth === 1536 && master.naturalHeight === 1024
    if (!masterReady && !ready(body, 6)) continue
    const frame = enemy.state === 'phase' ? 5
      : enemy.state === 'windup' ? 2
        : enemy.state === 'attack' ? 3
          : enemy.state === 'recover' ? ((enemy.releaseFx ?? 0) > 0.16 ? 3 : 4)
            : (Math.floor(state.worldClock * 6 + enemy.id) & 1)
    const h = size // Preserve square source-cell proportions and the existing feet anchor.
    ctx.save()
    ctx.translate(x, y)
    const weight = enemyWeight(enemy.kind)
    const def = ENEMY_DEFINITIONS[enemy.kind]
    const remaining = enemy.state === 'windup' ? enemy.timer / (def.windup * (enemy.affix === 'swift' ? 0.8 : 1))
      : enemy.state === 'attack' ? enemy.timer / 0.34 : (enemy.releaseFx ?? 0) / 0.32
    applyEnemyPose(ctx, enemy.state, remaining, enemy.facingX, enemy.facingY, weight, reducedMotion)
    applyEnemyRecoil(ctx, enemy.hitTime ?? 0, enemy.hitX ?? 0, enemy.hitY ?? 0, weight, reducedMotion)
    // These 6-frame strips share one artist-authored facing. This mirroring is
    // separate from the 8-direction hero atlas, which must NEVER be mirrored.
    if (enemy.facingX < 0) ctx.scale(-1, 1)
    if (masterReady && master) {
      // Master grid: 3 columns × 2 rows, 512px full-detail authored frames.
      const cell = 512
      ctx.drawImage(master, (frame % 3) * cell, Math.floor(frame / 3) * cell,
        cell, cell, -size / 2, -h + 5, size, h)
    } else if (body) {
      const sourceSide = body.naturalHeight
      ctx.drawImage(body, frame * sourceSide, 0, sourceSide, sourceSide, -size / 2, -h + 5, size, h)
    }
    if (enemy.state === 'windup' && pair && ready(pair.telegraph)) {
      // Decorative cue only; the true world-sized hitbox is drawn above.
      ctx.drawImage(pair.telegraph, 0, 0, pair.telegraph.naturalWidth, pair.telegraph.naturalHeight, -20, -h - 18, 40, 40)
    }
    ctx.restore()
    // Keep the bar above the windup cue in every pose so it never jumps or mirrors.
    const motion = sampleHealthBar(enemy, state.worldClock, healthBars, reducedMotion)
    if (shouldShowHealthBar(motion, showFullHealthBars))
      drawEnemyHealthBar(ctx, motion, x, y - h - 26, size, !!enemy.affix)
    drawn++
  }
  return drawn
}

/** Renderer-only projectiles; no changes to collision, damage or simulation. */
export function drawLiveFactionProjectiles(
  ctx: Ctx2D, state: GameState, runtime: FactionRuntime, ox: number, oy: number,
  sprites?: Partial<ProjectileSprites>, reduced = false,
): void {
  for (const shot of runtime.projectiles) {
    const x = shot.x + ox, y = shot.y + oy
    const margin = Math.max(48, shot.radius * 4)
    if (x < -margin || y < -margin || x > state.W + margin || y > state.H + margin) continue
    const art: ProjectileArtId = shot.kind === 'fire-imp' ? 'enemy-ember'
      : shot.kind === 'dark-archer' ? 'spectral-arrow'
        : shot.kind === 'frost-wraith' || shot.kind === 'crystal-sentinel' ? 'arcane-bolt' : 'enemy-hex'
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.atan2(shot.vy, shot.vx))
    drawEnergyMissile(ctx, sprites, art, shot.radius, shot.life, ENEMY_DEFINITIONS[shot.kind].telegraphColor, '#fff3dc', reduced)
    ctx.restore()
  }
}
