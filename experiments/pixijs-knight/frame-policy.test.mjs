import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as policy from './frame-policy.mjs'
const frame={clock:1,pose:'idle',phase:0,reducedMotion:true,reduceFlashing:false,view:2}
test('unchanged reduced-motion texture does not redraw at new clock or attack phase',()=>{assert.equal(policy.needsRigRender(frame,{...frame,clock:2,pose:'attack',phase:.5},false),false)})
test('reduced-motion directional view changes still redraw',()=>{assert.equal(policy.needsRigRender(frame,{...frame,clock:2,view:6},false),true)})
test('first draw and accessibility transitions redraw even while paused',()=>{assert.equal(policy.needsRigRender(null,frame,true),true);assert.equal(policy.needsRigRender(frame,{...frame,reducedMotion:false},true),true);assert.equal(policy.needsRigRender({...frame,reducedMotion:false},{...frame,reducedMotion:false,reduceFlashing:true},true),true)})
test('normal motion uses clock and pose; frozen frames reuse last texture',()=>{const p={...frame,reducedMotion:false};assert.equal(policy.needsRigRender(p,{...p,clock:2},false),true);assert.equal(policy.needsRigRender(p,{...p,pose:'attack'},false),true);assert.equal(policy.needsRigRender(p,{...p,clock:2,view:6},true),false);assert.equal(policy.needsRigRender(p,{...p},false),false)})
