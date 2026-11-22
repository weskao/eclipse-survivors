import { describe, expect, it } from 'vitest'
import { createState, resetRun } from './state'
import { spawnMob, tickSpawning } from './spawn'
import { createFactionBridge } from './content/enemies/integration'
import type { GameHooks, Mob } from './types'
import { step } from './step'

const hooks:GameHooks={sfx(){},message(){},offerUpgrades(){},end(){}}
function game() {
  const state=createState();resetRun(state)
  state.mode='play';state.W=800;state.H=500
  state.hero!.attack=999
  state.spawnT=999
  return state
}
describe('ES2 real faction gameplay and sprite source integration',()=>{
  it('keeps the combined 130 actor cap when legacy waves spawn alongside faction actors',()=>{
    const s=game(),bridge=createFactionBridge({random:()=>0.2})
    s.mobs=Array.from({length:120},()=>({hp:1} as Mob))
    for(let i=0;i<10;i++)bridge.spawn(s,'berserker',100+i,100)
    expect(bridge.availableSpawnSlots(s)).toBe(0)
    s.spawnT=0
    tickSpawning(s,.033,hooks,undefined,bridge.runtime.enemies.length)
    expect(s.mobs.length+bridge.runtime.enemies.length).toBe(130)
    spawnMob(s,undefined,bridge.runtime.enemies.length)
    expect(s.mobs.length+bridge.runtime.enemies.length).toBe(130)
  })
  it('routes real player shots into the faction runtime without duplicate damage or rewards',()=>{
    const s=game(),bridge=createFactionBridge({random:()=>0})
    const hero=s.hero!
    hero.x=0;hero.y=0
    const target=bridge.spawn(s,'shield-guardian',135,0)!
    target.speed=0
    s.shots.push({x:0,y:0,vx:12000,vy:0,d:30,r:5,life:1,kind:'arrow'})
    const hp=target.hp
    step(s,.02,{x:0,y:0},hooks,undefined,undefined,bridge)
    expect(target.hp).toBeLessThan(hp)
    expect(s.shots).toHaveLength(0)
    expect(s.kill).toBe(0)
  })
})