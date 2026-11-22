import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { createFactionRuntime, spawnFactionEnemy } from '../../content/enemies/runtime'
import { createFakeCtx } from '../fakes'
import { drawLiveFactionArt, type FactionArtwork } from './production-factions'

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
    ctx.drawImage=((...items:unknown[])=>{args.push(items);draw(...items)}) as typeof ctx.drawImage
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
    expect(args.some(a=>a[0]===image && a.slice(1,5).join() === '192,0,96,96')).toBe(true)
    expect(args.some(a=>a[0]===warning && a.slice(1,5).join() === '0,0,96,96')).toBe(true)
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
