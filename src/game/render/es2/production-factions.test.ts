import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { createFactionRuntime, spawnFactionEnemy } from '../../content/enemies/runtime'
import { createFakeCtx } from '../fakes'
import { drawLiveFactionArt, FACTION_VISUAL_SIZE, type FactionArtwork } from './production-factions'

const loaded = (w:number,h:number):HTMLImageElement => ({complete:true,naturalWidth:w,naturalHeight:h}) as HTMLImageElement

describe('ten live faction sprites use exact six-cell art on the world Canvas', () => {
  it('draws a real active enemy and its warning texture from an isolated cell', () => {
    const state=createState(); resetRun(state)
    state.W=900;state.H=600;state.worldClock=10
    const runtime=createFactionRuntime()
    const enemy=spawnFactionEnemy(runtime,'shadow-assassin',120,110)!
    enemy.state='windup'
    const image=loaded(576,96), warning=loaded(96,96)
    const images={ 'shadow-assassin':{body:image,telegraph:warning} } as FactionArtwork
    const args:unknown[][]=[]
    const {ctx}=createFakeCtx()
    const draw=ctx.drawImage.bind(ctx)
    ctx.drawImage=((...items:unknown[])=>{args.push(items);Reflect.apply(draw,ctx,items)}) as typeof ctx.drawImage
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
    expect(args.some(a=>a[0]===image && a.slice(1,5).join() === '192,0,96,96')).toBe(true)
    expect(args.some(a=>a[0]===warning && a.slice(1,5).join() === '0,0,96,96')).toBe(true)
    const bodyDraw = args.find(a => a[0] === image)!
    // A square authored atlas cell must not be stretched vertically at game size.
    expect(bodyDraw[7]).toBe(bodyDraw[8])
    expect(Number(bodyDraw[6]) + Number(bodyDraw[8])).toBe(5)
  })

  it('uses the 288-pixel source cells of a true 3x enemy atlas', () => {
    const state=createState(); resetRun(state)
    state.W=900;state.H=600
    const runtime=createFactionRuntime()
    const enemy=spawnFactionEnemy(runtime,'shadow-assassin',120,110)!
    enemy.state='windup'
    const image=loaded(1728,288), warning=loaded(144,144)
    const images={ 'shadow-assassin':{body:image,telegraph:warning} } as FactionArtwork
    const args:unknown[][]=[]
    const {ctx}=createFakeCtx()
    const draw=ctx.drawImage.bind(ctx)
    ctx.drawImage=((...items:unknown[])=>{args.push(items);Reflect.apply(draw,ctx,items)}) as typeof ctx.drawImage
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
    expect(args.some(a=>a[0]===image && a.slice(1,5).join() === '576,0,288,288')).toBe(true)
    expect(args.some(a=>a[0]===warning && a.slice(1,5).join() === '0,0,144,144')).toBe(true)
  })

  it('prefers the committed 512px authored assassin master frames, keeping size and foot anchor', () => {
    const state=createState(); resetRun(state); state.W=900; state.H=600
    const runtime=createFactionRuntime()
    const enemy=spawnFactionEnemy(runtime,'shadow-assassin',120,110)!
    enemy.state='attack'
    const body=loaded(1296,216), master=loaded(1536,1024)
    const images={ 'shadow-assassin':{body,telegraph:loaded(150,150),highResBody:master} } as FactionArtwork
    const args:unknown[][]=[]
    const {ctx}=createFakeCtx()
    const draw=ctx.drawImage.bind(ctx)
    ctx.drawImage=((...items:unknown[])=>{args.push(items);Reflect.apply(draw,ctx,items)}) as typeof ctx.drawImage
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
    const art=args.find(a=>a[0] === master)
    expect(art?.slice(1,5)).toEqual([0,512,512,512]) // frame 3 is row 2 col 1
    const size = FACTION_VISUAL_SIZE['shadow-assassin']
    expect(art?.slice(5)).toEqual([-size / 2, -size + 5, size, size])
    expect(args.some(a=>a[0]===body)).toBe(false)
  })

  it('uses existing approved geometry when the high-detail source is not decoded or malformed', () => {
    const state=createState(); resetRun(state);state.W=900;state.H=600
    const runtime=createFactionRuntime()
    const enemy=spawnFactionEnemy(runtime,'shadow-assassin',120,110)!
    enemy.state='attack'
    const body=loaded(1296,216)
    const images={ 'shadow-assassin':{body,telegraph:loaded(150,150),highResBody:loaded(1535,1024)} } as FactionArtwork
    const args:unknown[][]=[]
    const {ctx}=createFakeCtx()
    const draw=ctx.drawImage.bind(ctx)
    ctx.drawImage=((...items:unknown[])=>{args.push(items);Reflect.apply(draw,ctx,items)}) as typeof ctx.drawImage
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
    expect(args.some(a=>a[0]===body && a.slice(1,5).join() === '648,0,216,216')).toBe(true)
  })

  it('keeps a large enemy visible when its upper body enters from below the viewport', () => {
    const state=createState(); resetRun(state)
    state.W=300; state.H=200
    const runtime=createFactionRuntime()
    const size=FACTION_VISUAL_SIZE['shield-guardian']
    const enemy=spawnFactionEnemy(runtime,'shield-guardian',150,state.H+size-24)!
    enemy.state='windup'
    const image=loaded(2016,336)
    const images={ 'shield-guardian':{body:image,telegraph:loaded(150,150)} } as FactionArtwork
    const {ctx,drawn}=createFakeCtx()
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
    expect(drawn).toContain(image)
    // The safety margin protects nearby warning art; only the fully offscreen actor is culled.
    enemy.y=state.H+size+35
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(0)
  })

  it('does not waste draw calls on small enemies fully below the viewport', () => {
    const state=createState(); resetRun(state)
    state.W=300; state.H=200
    const runtime=createFactionRuntime()
    const size=FACTION_VISUAL_SIZE['fire-imp']
    const enemy=spawnFactionEnemy(runtime,'fire-imp',150,state.H+size+35)!
    const image=loaded(1260,210)
    const images={ 'fire-imp':{body:image,telegraph:loaded(150,150)} } as FactionArtwork
    const {ctx,drawn}=createFakeCtx()
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(0)
    expect(drawn).not.toContain(image)
  })

  it('never paints offscreen, dead or malformed source sheets', () => {
    const state=createState(); resetRun(state);state.W=200;state.H=200
    const runtime=createFactionRuntime()
    const enemy=spawnFactionEnemy(runtime,'phantom',5000,5000)!
    const images={phantom:{body:loaded(576,96),telegraph:loaded(96,96)}} as FactionArtwork
    const {ctx,drawn}=createFakeCtx()
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(0)
    enemy.x=100;enemy.y=100
    images.phantom.body=loaded(580,96)
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(0)
    expect(drawn).not.toContain(images.phantom.body)
    images.phantom.body=loaded(576,96);enemy.hp=0
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(0)
  })
})
