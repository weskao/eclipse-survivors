import { describe, expect, it } from 'vitest'
import { createState, resetRun } from '../../state'
import { hallPersistentCast, hallSummonCast, hallWorldHealing, reserveHallProc, hallRangerShot, hallWeaponCast, hallBurstProc, hallChestRevealed, hallChestRerolls, spendHallChestReroll, hallEffectDuration, hallSummonInterval, hallPickupHealing, hallAttackDelay, hallAttackRange, hallCritBonus, hallDamageTaken, hallExtraHit, hallIncoming, hallKill, hallMovement, hallOutgoing, installHallRun, tickHall } from './hall-runtime'
function run(ranks: Record<string, number>) {
  const state = createState()
  resetRun(state)
  state.mode = 'play'
  installHallRun(state, {hero:'knight',ranks:Object.freeze(ranks)})
  return state
}
describe('ES4 Hall runtime', () => {
  it('installs immutable per-run stat effects exactly once', () => {
    const base = run({})
    const state = run({'offense-edge':5,'defense-constitution':5,'mobility-stride':5,'hunt-learning':5})
    expect(state.hero!.damage).toBeCloseTo(base.hero!.damage*1.05)
    expect(state.hero!.max).toBe(base.hero!.max+20)
    expect(state.hero!.speed).toBeCloseTo(base.hero!.speed*1.05)
    expect(state.xpGainMultiplier).toBeCloseTo(1.025)
    installHallRun(state,{hero:'knight',ranks:{'offense-edge':5}})
    expect(state.hero!.damage).toBeCloseTo(base.hero!.damage*1.05)
  })
  it('gates outgoing damage by source, caps crit and blocks recursion', () => {
    const state=run({'offense-precision':5,'shadowblade-blade':5,'offense-momentum':5,'offense-execution':5,'offense-war-master':1,'arcana-focus':5,'arcana-resonance':5,'summons-bond':5})
    const enemy={hp:200,max:1000,slow:1}
    hallKill(state);hallKill(state);hallKill(state);hallKill(state)
    expect(hallOutgoing(state,100,enemy,'basic')).toBeCloseTo(108)
    expect(hallOutgoing(state,100,enemy,'weapon')).toBeCloseTo(115)
    expect(hallOutgoing(state,100,enemy,'summon')).toBeCloseTo(112)
    expect(hallCritBonus(state,'basic')).toBeCloseTo(.05)
    for(let i=0;i<7;i++)expect(hallExtraHit(state,100,'basic')).toBe(0)
    expect(hallExtraHit(state,100,'basic')).toBe(50)
    expect(hallExtraHit(state,100,'proc')).toBe(0)
    state.time=5
    expect(hallOutgoing(state,100,enemy,'basic')).toBeCloseTo(105)
  })
  it('handles shield threshold, regen and bounded after-dash movement', () => {
    const state=run({'defense-armor':5,'defense-resolve':5,'defense-recovery':5,'defense-ward':5,'defense-last-stand':1,'mobility-stride':5,'mobility-afterwind':5,'mobility-hunter':5,'offense-fervor':5})
    const h=state.hero!
    h.hp=h.max*.2
    expect(hallIncoming(state,100)).toBeCloseTo(90)
    hallDamageTaken(state,20,h.max*.35)
    expect(state.hall!.shield).toBeCloseTo(h.max*.08)
    state.time=20
    tickHall(state,1,true)
    expect(state.hall!.shield).toBeCloseTo(h.max*.04)
    expect(h.hp/h.max).toBeCloseTo(.2015)
    expect(hallMovement(state)*(1+state.hall!.stride)).toBeCloseTo(1.1)
    expect(hallAttackDelay(state)).toBeCloseTo(.96)
    h.moveAmount=1
    expect(hallAttackRange(state)).toBeCloseTo(1.05)
  })
})

it('tracks one elite reward, resonance windows and same-target marks without stacking', () => {
  const s = run({'synergy-hunter-instinct':1,'synergy-reaper':1,'offense-war-master':1,'ranger-mark':5})
  const enemy = {hp:100,max:100}
  hallKill(s,true)
  expect(hallMovement(s)).toBeCloseTo(1.08)
  for(let i=0;i<3;i++) expect(hallOutgoing(s,100,enemy,'basic')).toBe(100)
  expect(hallOutgoing(s,100,enemy,'basic')).toBeCloseTo(110)
  for(let i=0;i<7;i++) expect(hallExtraHit(s,100,'basic')).toBe(0)
  expect(hallExtraHit(s,100,'basic')).toBeCloseTo(62.5)
  s.time=6; hallKill(s,true)
  expect(hallMovement(s)).toBe(1)
  expect(s.hall!.reaperReady).toBe(false)
})

it('shares five earned rerolls between ordinary chest and elite rewards without affecting rare chests', () => {
  const s = run({'hunt-salvage':5,'hunt-pathfinder':1,'hunt-sustain':5,'summons-tenacity':5,'summons-duration':5,'summons-command':5,'spirit-summoner-pack':5})
  hallKill(s,true)
  for(let i=0;i<6;i++) hallChestRevealed(s,true)
  expect(hallChestRerolls(s,true)).toBe(5)
  expect(hallChestRerolls(s,false)).toBe(0)
  expect(spendHallChestReroll(s,false)).toBe(false)
  for(let i=0;i<5;i++) expect(spendHallChestReroll(s,true)).toBe(true)
  expect(spendHallChestReroll(s,true)).toBe(false)
  expect(hallPickupHealing(s,100)).toBeCloseTo(110)
  expect(hallEffectDuration(s)).toBeCloseTo(1.075)
  expect(hallSummonInterval(s)).toBeCloseTo(.94)
})

it('reserves piercing and storm arrows only once, and counts distinct casts for double sigil', () => {
  const s=run({'ranger-piercing-moon':1,'ranger-storm-hunter':1,'wizard-double-sigil':1})
  tickHall(s,0,true)
  expect(hallRangerShot(s)).toEqual({pierce:1,extra:.35})
  expect(hallRangerShot(s)).toEqual({pierce:0,extra:0})
  for(let i=0;i<5;i++) hallWeaponCast(s)
  expect(hallExtraHit(s,100,'weapon')).toBe(0)
  hallWeaponCast(s)
  expect(hallExtraHit(s,100,'weapon')).toBeCloseTo(30)
  expect(hallExtraHit(s,100,'weapon')).toBe(0)
})
it('arms iron counter only after actual riposte and star collapse only on area contact', () => {
  const s=run({'knight-riposte':5,'knight-iron-counter':1,'wizard-star-collapse':1})
  hallDamageTaken(s,10,s.hero!.hp)
  hallOutgoing(s,100,{hp:100,max:100},'basic')
  expect(hallBurstProc(s,100,'basic',false)).toEqual({damage:45,radius:120,limit:3})
  expect(hallBurstProc(s,100,'basic',false)).toBeNull()
  s.time=12
  expect(hallBurstProc(s,100,'weapon',false)).toBeNull()
  expect(hallBurstProc(s,100,'weapon',true)).toEqual({damage:40,radius:100,limit:5})
  expect(hallBurstProc(s,100,'proc',true)).toBeNull()
})

it('shares the global proc budget across burst and echo rather than stacking recursive effects',()=> {
  const s=run({'wizard-star-collapse':1,'arcana-echo':1})
  s.time=12
  expect(hallBurstProc(s,100,'weapon',true)?.damage).toBe(40)
  expect(hallExtraHit(s,100,'weapon')).toBe(0)
  s.time+=.125
  expect(hallExtraHit(s,100,'weapon')).toBe(35)
})

it('keeps Storm Hunter armed until the next basic arrow, not just the afterwind window', () => {
  const s = run({'ranger-storm-hunter':1})
  tickHall(s,0,true)
  s.time=3
  expect(hallRangerShot(s).extra).toBeCloseTo(.35)
  expect(hallRangerShot(s).extra).toBe(0)
  s.time=4
  tickHall(s,0,true)
  s.time=14
  expect(hallRangerShot(s).extra).toBe(0)
  tickHall(s,0,true)
  expect(hallRangerShot(s).extra).toBeCloseTo(.35)
})

it('reserves the shared Hall proc interval once, including delayed hero strikes', () => {
  const s=run({'shadowblade-phantom':1,'arcana-echo':1})
  s.time=12
  expect(reserveHallProc(s)).toBe(true)
  expect(reserveHallProc(s)).toBe(false)
  expect(hallExtraHit(s,100,'weapon')).toBe(0)
  s.time+=.125
  expect(hallExtraHit(s,100,'weapon')).toBe(35)
  s.mode='paused'
  s.time+=1
  expect(reserveHallProc(s)).toBe(false)
})

it('triggers Soulward on new persistent activations, not repeated ticks or pause', () => {
  const s=run({'summons-soulward':5})
  hallPersistentCast(s,'orb')
  expect(s.hall!.soulwardUntil).toBe(3)
  s.time=12
  hallPersistentCast(s,'orb')
  expect(s.hall!.soulwardUntil).toBe(3)
  s.mode='paused'
  hallPersistentCast(s,'gravity-orbs')
  hallSummonCast(s)
  expect(s.hall!.soulwardUntil).toBe(3)
  s.mode='play'
  hallPersistentCast(s,'gravity-orbs')
  expect(s.hall!.soulwardUntil).toBe(15)
})
it('boosts only health pickup interactions, not purchased or consolation healing', () => {
  const s=run({'hunt-sustain':5})
  expect(hallWorldHealing(s,'events:healing-fountain','drink',45)).toBeCloseTo(49.5)
  expect(hallWorldHealing(s,'events:divine-shrine','heal',36)).toBeCloseTo(39.6)
  expect(hallWorldHealing(s,'events:wandering-merchant','restock',24)).toBe(24)
  expect(hallWorldHealing(s,'events:monster-ambush','decline',8)).toBe(8)
  expect(hallWorldHealing(run({}),'events:healing-fountain','drink',45)).toBe(45)
})
