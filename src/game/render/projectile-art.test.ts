import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createFakeCtx } from './fakes'
import { PROJECTILE_ART, loadProjectileSprites, drawProjectileSprite } from './projectile-art'

describe('authored projectile presentation', () => {
  it('ships transparent vector source artwork for each visible combat projectile', () => {
    const ids = ['ranger-arrow', 'arcane-bolt', 'enemy-hex', 'enemy-ember', 'shadow-dagger', 'holy-lance', 'bone-spear', 'ricochet-blade', 'spectral-arrow', 'gravity-core', 'arcane-mine'] as const
    expect(Object.keys(PROJECTILE_ART).sort()).toEqual([...ids].sort())
    for (const id of ids) {
      const data = readFileSync(resolve(process.cwd(), 'src/assets/es2/production/projectiles/' + id + '.svg'), 'utf8')
      expect(data).toContain('<svg')
      expect(data).toMatch(/viewBox="0 0 192 192"/)
      expect(data).not.toContain('<image')
    }
  })

  it('preloads the illustration URLs once and draws correct centered sprite without shifting collision geometry', () => {
    const imgs: { src: string; naturalWidth: number; complete: boolean }[] = []
    const sprites = loadProjectileSprites(() => {
      const img = { src: '', naturalWidth: 192, complete: true }
      imgs.push(img)
      return img as HTMLImageElement
    })
    expect(imgs).toHaveLength(Object.keys(PROJECTILE_ART).length)
    const { ctx } = createFakeCtx()
    const draw: unknown[][] = []
    ctx.drawImage = ((...args: unknown[]) => { draw.push(args) }) as typeof ctx.drawImage
    expect(drawProjectileSprite(ctx, sprites, 'ranger-arrow', 54, 24)).toBe(true)
    expect(draw[0]?.slice(1)).toEqual([-27, -12, 54, 24])
  })

  it('preserves the old procedural fallback until assets decode or when an asset fails', () => {
    const sprites = loadProjectileSprites(() => ({ src: '', naturalWidth: 0, complete: false }) as HTMLImageElement)
    const { ctx, calls } = createFakeCtx()
    expect(drawProjectileSprite(ctx, sprites, 'arcane-bolt', 52)).toBe(false)
    expect(calls).not.toContain('drawImage')
  })
})
