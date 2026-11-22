import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

type Asset = {
  id: string; path: string; width: number; height: number
  scale: number; frames: number; alpha: boolean; maxBytes: number
  status: string; sha256?: string
}
type Manifest = { schemaVersion: number; category: string; status: string; assets: Asset[] }
const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const expected: Record<string, string[]> = {"heroes":["shadowblade","spirit-summoner","crimson-paladin"],"enemies":["shadow-assassin","shadow-assassin:telegraph","necromancer","necromancer:telegraph","dark-archer","dark-archer:telegraph","plague-carrier","plague-carrier:telegraph","shield-guardian","shield-guardian:telegraph","phantom","phantom:telegraph","fire-imp","fire-imp:telegraph","frost-wraith","frost-wraith:telegraph","berserker","berserker:telegraph","crystal-sentinel","crystal-sentinel:telegraph"],"bosses":["abyss-monarch","frost-sovereign","infernal-titan","eclipse-seraph"],"biomes":["blood-moon-cathedral:ground","blood-moon-cathedral:decor","cursed-forest:ground","cursed-forest:decor","abyssal-necropolis:ground","abyssal-necropolis:decor","celestial-rift:ground","celestial-rift:decor"],"ui":["treasure-common","treasure-rare","treasure-legendary","treasure-cursed","rarity-common","rarity-rare","rarity-legendary","hud-health","hud-xp","hud-cooldown","hud-quest","achievement-boss","achievement-survivor","achievement-evolution","achievement-explorer","achievement-collector","achievement-flawless"]}
const categories = Object.keys(expected)
const manifests = Object.fromEntries(categories.map(category => {
  const path = join(root, category, 'manifest.json')
  return [category, JSON.parse(readFileSync(path, 'utf8')) as Manifest]
})) as Record<string, Manifest>

function inspectWebP(path: string, maxBytes: number) {
  const data = readFileSync(path)
  expect(data.length, path).toBeGreaterThan(40)
  expect(data.length, path).toBeLessThanOrEqual(maxBytes)
  expect(data.toString('ascii', 0, 4), path).toBe('RIFF')
  expect(data.toString('ascii', 8, 12), path).toBe('WEBP')
  expect(data.readUInt32LE(4) + 8, path).toBe(data.length)
  expect(data.toString('ascii', 12, 16), path).toBe('VP8X')
  return {
    width: data.readUIntLE(24, 3) + 1,
    height: data.readUIntLE(27, 3) + 1,
    alpha: !!(data[20]! & 0x10),
    sha256: createHash('sha256').update(data).digest('hex'),
  }
}

describe('ES2 canonical production art / blocking acceptance gate', () => {
  it('covers exactly the required canonical heroes, enemies, bosses, biomes and UI artwork', () => {
    for (const category of categories) {
      const manifest = manifests[category]!
      expect(manifest.schemaVersion).toBe(1)
      expect(manifest.category).toBe(category)
      expect(manifest.assets.map(a => a.id).sort()).toEqual([...expected[category]!].sort())
      expect(new Set(manifest.assets.map(a => a.path)).size).toBe(manifest.assets.length)
      for (const a of manifest.assets) {
        expect(a.path).toMatch(/^[a-z0-9-]+@3x[.]webp$/)
        expect(a.path).toContain('@3x.webp')
        expect(a.scale).toBe(3)
        expect(a.width).toBeGreaterThan(0)
        expect(a.height).toBeGreaterThan(0)
        expect(a.width % 3).toBe(0)
        expect(a.height % 3).toBe(0)
      }
    }
  })

  it('fails RED while any required actual WebP asset is missing', () => {
    const missing = categories.flatMap(category =>
      manifests[category]!.assets
        .filter(a => !existsSync(join(root, category, a.path)))
        .map(a => category + '/' + a.id))
    expect(missing, 'MISSING ' + missing.length + ': ' + missing.join(', ')).toEqual([])
  })

  it('validates real WebP bytes, 3x frame geometry, alpha, file budget, hashes and duplicate bytes', () => {
    const shaMap = new Map<string, string>()
    let checked = 0
    for (const category of categories) for (const a of manifests[category]!.assets) {
      const path = resolve(root, category, a.path)
      expect(path.startsWith(join(root, category) + sep), path).toBe(true)
      if (!existsSync(path)) continue // The completeness test above is the blocking gate.
      const v = inspectWebP(path, a.maxBytes)
      expect([v.width, v.height], a.id).toEqual([a.width, a.height])
      expect(v.alpha, a.id).toBe(a.alpha)
      expect(a.width % a.frames, a.id).toBe(0)
      if (a.sha256) expect(v.sha256, a.id).toBe(a.sha256)
      expect(shaMap.has(v.sha256), a.id + ' duplicates ' + shaMap.get(v.sha256)).toBe(false)
      shaMap.set(v.sha256, a.id)
      checked++
    }
    expect(checked, 'No WebPs have been delivered').toBeGreaterThan(0)
  })

  it('keeps unreviewed image synthesis blocked until manual visual approval', () => {
    const blocked = categories.flatMap(category =>
      manifests[category]!.assets.filter(a => a.status !== 'approved')
        .map(a => category + '/' + a.id))
    expect(blocked, 'UNREVIEWED: ' + blocked.join(', ')).toEqual([])
    for (const category of categories) expect(manifests[category]!.status).toBe('approved')
  })
})
