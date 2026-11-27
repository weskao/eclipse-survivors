import { describe, expect, it } from 'vitest'
import { HALL_GROUPS, HALL_TALENTS } from './hall-talents'
import { createMetaState, type MetaState } from './state'
import { emptyHall, purchaseHallTalent, equipHall, resolveHallRunSnapshot, validHall } from './hall-state'

function fixture(): MetaState {
  const state: MetaState = { ...createMetaState(), version: 4, hall: emptyHall(), embers: 50000 }
  for (const key of Object.keys(state.research)) state.research[key] = 5
  for (const id of ['knight', 'ranger', 'wizard', 'heroes:shadowblade', 'heroes:spirit-summoner', 'heroes:crimson-paladin']) state.mastery[id] = { xp: 5000, level: 6 }
  return state
}
function allOwned(): MetaState {
  let state = fixture()
  for (const node of HALL_TALENTS) for (let rank = 0; rank < node.maxRank; rank++) {
    const next = purchaseHallTalent(state, node.id, node.group, rank)
    expect(next, node.id).not.toBeNull()
    state = next!
  }
  return state
}
describe('ES4 ownership and attunement', () => {
  it('rejects missing prerequisites, wrong hero, insufficient funds, stale taps and connected wallet spending', () => {
    const state = fixture()
    expect(purchaseHallTalent(state, 'offense-precision', 'knight', 0)).toBeNull()
    expect(purchaseHallTalent(state, 'knight-discipline', 'ranger', 0)).toBeNull()
    expect(purchaseHallTalent({...state, embers: 39}, 'offense-edge', 'knight', 0)).toBeNull()
    expect(purchaseHallTalent({...state, cloudWallet:{revision:1,embers:50000}}, 'offense-edge', 'knight', 0)).toBeNull()
    const next = purchaseHallTalent(state, 'offense-edge', 'knight', 0)!
    expect(next.embers).toBe(49960)
    expect(state.hall?.ownership).toEqual({})
    expect(purchaseHallTalent(next, 'offense-edge', 'knight', 0)).toBeNull()
  })
  it('can reach all 264 new ranks with actual prerequisites, and rejects invalid ownership', () => {
    const state = allOwned()
    expect(Object.keys(state.hall!.ownership)).toHaveLength(72)
    expect(Object.values(state.hall!.ownership).reduce((a,b)=>a+b,0)).toBe(264)
    expect(state.embers).toBe(5120)
    expect(validHall(state.hall, state)).toBe(true)
    expect(validHall({...state.hall,ownership:{unknown:1}},state)).toBe(false)
  })
  it('separates owned and active, rejects invalid slots and freezes a run snapshot', () => {
    const state = allOwned()
    expect(equipHall(state,'knight',['offense-war-master','defense-last-stand','arcana-echo'],null,null)).toBeNull()
    expect(equipHall(state,'knight',[],'ranger-piercing-moon',null)).toBeNull()
    const equipped = equipHall(state,'knight',['offense-war-master','defense-last-stand'],'knight-bulwark','synergy-blade-and-bastion')!
    const snap = resolveHallRunSnapshot(equipped,'knight')
    expect(snap.ranks['synergy-blade-and-bastion']).toBe(1)
    expect(snap.ranks['knight-bulwark']).toBe(1)
    expect(snap.ranks['knight-iron-counter']).toBeUndefined()
    expect(snap.ranks['ranger-aim']).toBeUndefined()
    expect(Object.isFrozen(snap.ranks)).toBe(true)
    const changed = equipHall(equipped,'knight',['offense-war-master'],null,'synergy-blade-and-bastion')!
    expect(resolveHallRunSnapshot(changed,'knight').ranks['synergy-blade-and-bastion']).toBeUndefined()
    expect(snap.ranks['synergy-blade-and-bastion']).toBe(1)
  })
})

describe('six heroes, twelve signature builds and six resonance pairs', () => {
  const heroes = HALL_GROUPS.filter(group => group.kind === 'hero')
  const resonances = HALL_TALENTS.filter(node => node.group === 'synergy')
  it.each(heroes.map(group => group.id))('keeps both %s signatures mutually exclusive and excludes other heroes', hero => {
    const state=allOwned()
    const signatures=HALL_TALENTS.filter(node=>node.group===hero&&node.maxRank===1)
    expect(signatures).toHaveLength(2)
    const before=JSON.stringify(state)
    for(const signature of signatures) {
      const selected=equipHall(state,hero,[],signature.id,null)!
      const snapshot=resolveHallRunSnapshot(selected,hero)
      expect(snapshot.ranks[signature.id]).toBe(1)
      for(const other of HALL_TALENTS.filter(node=>heroes.some(group=>group.id===node.group))) {
        if(other.group!==hero || (other.maxRank===1&&other.id!==signature.id)) expect(snapshot.ranks[other.id],other.id).toBeUndefined()
        else expect(snapshot.ranks[other.id],other.id).toBe(other.maxRank)
      }
    }
    expect(JSON.stringify(state)).toBe(before)
  })
  it.each(resonances.map(node=>node.id))('activates %s only when both required keystones are equipped', id => {
    const state=allOwned()
    const node=resonances.find(item=>item.id===id)!
    const ids=node.requires.map(req=>req.id)
    const full=equipHall(state,'knight',ids,null,id)!
    const partial=equipHall(state,'knight',ids.slice(0,1),null,id)!
    expect(resolveHallRunSnapshot(full,'knight').ranks[id]).toBe(1)
    expect(resolveHallRunSnapshot(partial,'knight').ranks[id]).toBeUndefined()
    expect(partial.hall!.ownership[id]).toBe(1)
    expect(Object.isFrozen(resolveHallRunSnapshot(full,'knight').ranks)).toBe(true)
  })
})
