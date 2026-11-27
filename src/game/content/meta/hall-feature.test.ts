import { describe, expect, it } from 'vitest'
import { createHallFeature } from './hall-feature'
import { createMetaState } from './state'

describe('ES4 Hall feature boundary', () => {
  it.each([undefined, '', '0', 'false', 'true', 'yes'])('defaults to legacy for %s', flag => {
    const feature = createHallFeature(flag, true, true)
    expect(feature.visible).toBe(false)
    expect(feature.playable).toBe(false)
    expect(feature.metaVersion).toBe(3)
    expect(feature.allowsWallet).toBe(true)
    expect(feature.canEdit('menu', null)).toBe(false)
    const state=createMetaState()
    state.version=4;state.research.power=1
    state.hall={ownership:{'offense-edge':1},attunement:{universal:[],hero:{},resonance:null}}
    expect(feature.snapshot(state,'knight').ranks).toEqual({})
    expect(feature.treasureControls(7,3)).toEqual({})
  })
  it('enables an isolated V4 strategy only in unlocked development', () => {
    const state = createMetaState()
    state.version=4; state.research.power=1
    state.hall={ownership:{'offense-edge':1},attunement:{universal:[],hero:{},resonance:null}}
    const enabled=createHallFeature('1',true,true)
    expect(enabled.visible).toBe(true)
    expect(enabled.metaVersion).toBe(4)
    expect(enabled.allowsWallet).toBe(false)
    expect(enabled.canEdit('menu',null)).toBe(true)
    expect(enabled.canEdit('play',null)).toBe(false)
    expect(enabled.canEdit('menu','account')).toBe(false)
    expect(enabled.snapshot(state,'knight').ranks['offense-edge']).toBe(1)
    expect(enabled.treasureControls(7,3)).toEqual({chestId:7,rerolls:3})
    for (const [dev, unlocked] of [[false,true],[true,false],[false,false]]) {
      const preview=createHallFeature('1',!!dev,!!unlocked)
      expect(preview.visible).toBe(true)
      expect(preview.metaVersion).toBe(3)
      expect(preview.canEdit('menu',null)).toBe(false)
      expect(preview.snapshot(state,'knight').ranks).toEqual({})
      expect(preview.allowsWallet).toBe(true)
    }
  })
})
