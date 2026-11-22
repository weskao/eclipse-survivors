import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const archive = readFileSync(resolve(process.cwd(), 'src/components/es2/menu/Es2Archive.vue'), 'utf8')
const environment = readFileSync(resolve(process.cwd(), 'src/game/render/environment.ts'), 'utf8')

describe('ES2 production sheet previews keep every atlas cell isolated', () => {
  const strips = [
    { kind: 'enemy', frames: 6, stride: 96, total: 576 },
    { kind: 'boss', frames: 3, stride: 120, total: 360 },
    { kind: 'decor', frames: 4, stride: 96, total: 384 },
  ] as const

  for (const { kind, frames, stride, total } of strips) {
    it(`shows every ${kind} frame without skipping or blending adjacent cells`, () => {
      // CSS steps(N, end) exposes positions 0 .. N-1, each exactly one sprite width apart.
      const animation = `animation:es2-world-${kind === 'decor' ? 'decor' : kind}-preview`
      expect(archive).toContain(`${animation} ${kind === 'enemy' ? '1.25s' : kind === 'boss' ? '1.8s' : '2s'} steps(${frames},end) infinite`)
      expect(archive).toContain(`@keyframes es2-world-${kind}-preview{to{background-position:-${total}px 0}}`)
      expect(total / frames).toBe(stride)
    })
  }

  it('draws square biome decor cells without stretching into a taller silhouette', () => {
    expect(environment).toContain('const sourceSide = decor.naturalHeight')
    expect(environment).toContain('ctx.drawImage(decor, (o.variant % 4) * sourceSide, 0, sourceSide, sourceSide, x - 55, y - 105, 110, 110)')
  })

  it('shows complete biome illustrations without cover-cropping the composition', () => {
    expect(archive).toMatch(/\.es2-world-art-scene\{[^}]*object-fit:contain/)
    expect(archive).toContain('@media(prefers-reduced-motion:reduce)')
  })
})
