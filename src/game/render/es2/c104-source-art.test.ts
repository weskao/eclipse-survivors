import { describe, it, expect } from 'vitest'
import { C104_SOURCES, C104_SURFACES, cropC104Cell, type C104Rect } from './c104-source-art'
import type { Ctx2D } from '../ctx'

describe('c104 original ten-sheet production runtime coverage', () => {
  it('references all ten immutable authored PNGs without leaving any as orphan files', () => {
    expect(Object.keys(C104_SOURCES)).toHaveLength(10)
    const used = new Set(Object.values(C104_SURFACES).flatMap(x => x.sources))
    expect(used).toEqual(new Set(Object.keys(C104_SOURCES)))
    for (const [id, source] of Object.entries(C104_SOURCES)) expect(source).toMatch(new RegExp(`${id}-sheet.*\\.png(?:\\?|$)`))
  })
  it('has semantic mappings for heroes, enemies, bosses, environments and UI', () => {
    for (const [category, { sources }] of Object.entries(C104_SURFACES)) {
      const prefix = category === 'heroes' ? 'hero-' : `${category}-`
      for (const id of sources) expect(id.startsWith(prefix)).toBe(true)
    }
    expect(C104_SURFACES.heroes.sources).toHaveLength(3)
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
