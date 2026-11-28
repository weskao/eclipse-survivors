import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { cleanupFactionEnemies, createFactionRuntime, damageFactionEnemy, spawnFactionEnemy, tickFactionEnemies } from '../../content/enemies/runtime'
import { ENEMY_DEFINITIONS, type FactionKind } from '../../content/enemies/definitions'
import { createFakeCtx } from '../fakes'
import { drawLiveFactionArt, loadProductionFactionArt, FACTION_VISUAL_SIZE, type FactionArtwork } from './production-factions'

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

  it('preloads one full-detail Frost Wraith source per renderer, not per actor or frame', () => {
    const assigned: string[] = []
    const made = (): HTMLImageElement => ({
      complete: false,
      set src(url: string) { assigned.push(url) },
    }) as unknown as HTMLImageElement
    const sources = loadProductionFactionArt(made)
    expect(sources['frost-wraith'].highResBody).toBeDefined()
    expect(assigned.some(url => url.includes('frost-wraith-6poses-3x2-master'))).toBe(true)
    expect(assigned).toHaveLength(22) // 10 body + 10 cues + 2 genuine masters
  })

  it('draws actual Frost Wraith authored 512px master cells at live 166px size with consistent foot anchor', () => {
    const state=createState(); resetRun(state);state.W=900;state.H=600
    const runtime=createFactionRuntime()
    const actor=spawnFactionEnemy(runtime,'frost-wraith',120,110)!
    actor.state='recover'
    const body=loaded(1368,228), master=loaded(1536,1024)
    const images={ 'frost-wraith':{body,telegraph:loaded(150,150),highResBody:master} } as FactionArtwork
    const calls:unknown[][]=[]
    const {ctx}=createFakeCtx()
    const original=ctx.drawImage.bind(ctx)
    ctx.drawImage=((...args:unknown[])=>{ calls.push(args);Reflect.apply(original,ctx,args) }) as typeof ctx.drawImage
    expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
    const art=calls.find(a=>a[0]===master)
    expect(art?.slice(1,5)).toEqual([512,512,512,512]) // frame 4, row 2 col 2
    const size=FACTION_VISUAL_SIZE['frost-wraith']
    expect(art?.slice(5)).toEqual([-size/2,-size+5,size,size])
    expect(calls.some(a=>a[0]===body)).toBe(false)
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
    expect(runtime.enemies).toContain(enemy)
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

it('renders a cosmetic faction death from the original body art, without retaining an active actor or warning', () => {
  const state=createState(); resetRun(state);state.W=900;state.H=600
  const runtime=createFactionRuntime()
  const enemy=spawnFactionEnemy(runtime,'shadow-assassin',120,110)!
  enemy.hp=0
  enemy.deathVisual=.28
  const image=loaded(576,96)
  const images={ 'shadow-assassin':{body:image,telegraph:loaded(96,96)} } as FactionArtwork
  const {ctx,drawn}=createFakeCtx()
  expect(drawLiveFactionArt(ctx,state,runtime,images,0,0)).toBe(1)
  expect(drawn).toHaveLength(1)
})

it.each(Object.keys(ENEMY_DEFINITIONS) as FactionKind[])('keeps %s idle art still under Reduced Motion without removing attack cues', kind => {
  const s = createState(); resetRun(s); s.W = 900; s.H = 600
  const runtime = createFactionRuntime()
  const enemy = spawnFactionEnemy(runtime, kind, 120, 110)!
  const body = loaded(576, 96), warning = loaded(96, 96)
  const art = { [kind]: { body, telegraph: warning } } as FactionArtwork
  const sample = (clock: number, reduced: boolean) => {
    s.worldClock = clock
    const { ctx } = createFakeCtx()
    const calls: unknown[][] = []
    ctx.drawImage = (...args: unknown[]) => { calls.push(args) }
    expect(drawLiveFactionArt(ctx, s, runtime, art, 0, 0, undefined, reduced)).toBe(1)
    return calls
  }
  const cell = (calls: unknown[][]) => calls.find(args => args[0] === body)?.slice(1, 5)
  expect(cell(sample(0, false))).not.toEqual(cell(sample(.2, false)))
  expect(cell(sample(0, true))).toEqual(cell(sample(.2, true)))
  enemy.state = 'windup'
  const windup = sample(.2, true)
  expect(cell(windup)).toEqual([192, 0, 96, 96])
  expect(windup.some(args => args[0] === warning)).toBe(true)
  enemy.state = 'attack'
  expect(cell(sample(.2, true))).toEqual([288, 0, 96, 96])
})

it.each(Object.keys(ENEMY_DEFINITIONS) as FactionKind[])('renders real %s hit, windup, release, fallen pose and expiry', kind => {
  const state = createState(); resetRun(state); state.W = 900; state.H = 600
  const runtime = createFactionRuntime()
  const enemy = spawnFactionEnemy(runtime, kind, 200, 220)!
  const body = loaded(576, 96), warning = loaded(96, 96)
  const art = { [kind]: { body, telegraph: warning } } as FactionArtwork
  const arena = { runtime, hero: { x: 250, y: 220 }, width: 900, height: 600, onHeroDamage: () => true }
  const sample = (reduced = false) => {
    const fake = createFakeCtx()
    const frames: unknown[][] = []
    const original = fake.ctx.drawImage.bind(fake.ctx)
    fake.ctx.drawImage = (...args: unknown[]) => { frames.push(args); Reflect.apply(original, fake.ctx, args) }
    drawLiveFactionArt(fake.ctx, state, runtime, art, 0, 0, undefined, reduced)
    return { ...fake, frames }
  }
  const slot = (sampled: ReturnType<typeof sample>) => sampled.frames.find(args => args[0] === body)?.slice(1, 5)
  expect(damageFactionEnemy(runtime, enemy, 1, 150, 220)).toBeGreaterThan(0)
  expect(enemy.hitTime).toBeCloseTo(.24)
  // Sample after the recoil has advanced but before starting the actual attack.
  enemy.state = 'recover'; enemy.timer = .1
  tickFactionEnemies(arena, .05)
  expect(sample().calls).toContain('rotate')
  expect(sample(true).calls).not.toContain('rotate')
  tickFactionEnemies(arena, .06)
  enemy.phaseCooldown = 10 // Do not replace Phantom's attack with its separate phase ability.
  tickFactionEnemies(arena, .01)
  expect(enemy.state).toBe('windup')
  expect(slot(sample(true))).toEqual([192, 0, 96, 96])
  expect(sample(true).drawn).toContain(warning)
  tickFactionEnemies(arena, enemy.timer + .001)
  expect(enemy.releaseFx).toBeGreaterThan(.16)
  expect(slot(sample(true))).toEqual([288, 0, 96, 96])
  expect(damageFactionEnemy(runtime, enemy, enemy.hp * 10, 150, 220)).toBeGreaterThan(0)
  cleanupFactionEnemies(runtime)
  expect(runtime.enemies).not.toContain(enemy)
  expect(runtime.fallen).toContain(enemy)
  expect(slot(sample())).toEqual([384, 0, 96, 96])
  expect(sample().drawn).not.toContain(warning)
  expect(sample(true).drawn).not.toContain(body)
  tickFactionEnemies(arena, (enemy.deathVisualTotal ?? .46) + .01)
  expect(runtime.fallen).not.toContain(enemy)
  expect(sample().drawn).not.toContain(body)
})

it('suppresses decorative faction motes under Reduced Flashing but preserves the warning geometry and live art', () => {
  const s = createState(); resetRun(s); s.W = 900; s.H = 600
  const runtime = createFactionRuntime()
  const enemy = spawnFactionEnemy(runtime, 'fire-imp', 200, 220)!
  enemy.state = 'windup'; enemy.timer = .2; enemy.aimX = 250; enemy.aimY = 220
  const body = loaded(1260, 210), warning = loaded(150, 150)
  const art = { 'fire-imp': { body, telegraph: warning } }
  const before = JSON.stringify(runtime)
  const sample = (flashing: boolean) => {
    const f = createFakeCtx()
    drawLiveFactionArt(f.ctx, s, runtime, art, 0, 0, undefined, false, false, flashing)
    return f
  }
  const normal = sample(false), quiet = sample(true)
  expect(normal.calls).toContain('fill')
  expect(quiet.calls).not.toContain('fill')
  expect(quiet.calls).toContain('arc')
  expect(quiet.calls).toContain('stroke')
  expect(quiet.drawn).toEqual([body, warning])
  expect(JSON.stringify(runtime)).toBe(before)
})
