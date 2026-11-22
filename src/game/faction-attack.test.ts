import { describe, expect, it } from 'vitest'
import { createState, resetRun } from './state'
import { attack } from './combat'
import { createFactionBridge } from './content/enemies/integration'
import type { GameHooks } from './types'

const hooks: GameHooks={sfx(){},message(){},offerUpgrades(){},end(){}}
function state(job: 'knight'|'ranger'|'wizard') {
  const s=createState();s.choice=job;resetRun(s);s.mode='play';s.hero!.x=0;s.hero!.y=0
  s.mobs=[]
  return s
}
describe('new faction actors are actual, targetable enemies',()=>{
  it('knight hits the nearest visible faction in real attack arc',()=>{
    const s=state('knight'), bridge=createFactionBridge({random:()=>0})
    const target=bridge.spawn(s,'berserker',75,0)!
    const hp=target.hp
    attack(s,hooks,bridge)
    expect(target.hp).toBeLessThan(hp)
    expect(s.hero!.strike).toBeGreaterThan(0)
  })
  for(const job of ['ranger','wizard'] as const) {
    it(job+' aims a real projectile at the nearest faction when legacy pool is empty',()=>{
      const s=state(job),bridge=createFactionBridge({random:()=>0})
      bridge.spawn(s,'dark-archer',135,0)
      attack(s,hooks,bridge)
      expect(s.shots.length).toBeGreaterThan(0)
      expect(s.hero!.aimAngle).toBeCloseTo(0,1)
    })
  }
})