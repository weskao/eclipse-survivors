import { describe, it, expect } from 'vitest'
import { C104_SOURCES, C104_SURFACES, cropC104Cell, type C104Rect } from './c104-source-art'
import type { Ctx2D } from '../ctx'

describe('c104 original ten-sheet production runtime coverage', () => {
  it('uses the ten pixel-exact WebP masters (PNG originals retired)', () => {
    expect(Object.keys(C104_SOURCES)).toEqual(['imgs1','imgs2','imgs3','imgs4','imgs5','imgs6','imgs7','imgs8','imgs9','imgs10'])
    const used = new Set(Object.values(C104_SURFACES).flatMap(x => x.sources))
    expect(used).toEqual(new Set(Object.keys(C104_SOURCES)))
    for (const source of Object.values(C104_SOURCES)) expect(source).toMatch(/\.webp(?:\?|$)/)
  })
  it('has semantic mappings for heroes, enemies, bosses, environments and UI', () => {
    expect(C104_SURFACES.heroes.sources).toEqual(['imgs2','imgs3','imgs4'])
    expect(C104_SURFACES.enemies.sources).toEqual(['imgs5','imgs6'])
    expect(C104_SURFACES.bosses.sources).toEqual(['imgs7','imgs8'])
    expect(C104_SURFACES.biomes.sources).toEqual(['imgs1','imgs9'])
    expect(C104_SURFACES.ui.sources).toEqual(['imgs10'])
  })
  it('strictly rejects a crop overlapping another frame or outside its source dimensions', () => {
    const draw: unknown[][] = []
    const ctx = { drawImage: (...args: unknown[]) => draw.push(args) } as unknown as Ctx2D
    const sheet = { complete:true,naturalWidth:1448,naturalHeight:1086 } as HTMLImageElement
    const rect: C104Rect = { x:12,y:16,width:100,height:120 }
    expect(cropC104Cell(ctx,sheet,rect,0,0,96,96,{x:8,y:12,width:108,height:130})).toBe(true)
    expect(draw[0]!.slice(1,5)).toEqual([12,16,100,120])
    expect(cropC104Cell(ctx,sheet,{x:107,y:16,width:20,height:120},0,0,96,96,{x:8,y:12,width:108,height:130})).toBe(false)
    expect(cropC104Cell(ctx,sheet,{x:1450,y:16,width:30,height:40},0,0,96,96,{x:1400,y:0,width:48,height:80})).toBe(false)
    expect(draw).toHaveLength(1)
  })
})
