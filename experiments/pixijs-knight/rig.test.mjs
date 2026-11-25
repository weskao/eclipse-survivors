import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as rig from './rig.mjs'
const joints = { left: [[.4,.6],[.3,.8],[.2,.9]], right: [[.6,.6],[.7,.8],[.8,.9]] }
const regions = Array.from({length:10},()=>[.5,.5,.2,.2])
const make = (id, overrides={})=>rig.defineRig({id,width:108,height:134,sourceAngle:0,legJoints:joints,regions, ...overrides})
test('a second hero supplies its own dimensions, joints, grip regions and weapon angle',()=>{
 const p=make('second',{width:111,height:144,sourceAngle:1.1}); assert.equal(p.width,111);assert.equal(p.sourceAngle,1.1);assert.equal(p.id,'second');assert.notEqual(p.legJoints,joints)
})
test('invalid rig data fails before renderer initialization',()=>{
 assert.throws(()=>make('bad',{regions:[]}));assert.throws(()=>make('bad',{width:0}));assert.throws(()=>make('bad',{sourceAngle:NaN}));assert.throws(()=>make('bad',{legJoints:{left:joints.left}}))
})
test('stationary keeps the previous authored facing; attack takes priority over travel',()=>{
 const p=make('a');assert.equal(rig.facingFor(p,{slot:8,heading:0,aim:0,pose:'idle'},6),6);assert.equal(rig.facingFor(p,{slot:6,heading:Math.PI*1.5,aim:Math.PI,pose:'attack'},0),4);assert.equal(rig.facingFor(p,{slot:6,heading:Math.PI*1.5,aim:0,pose:'run'},0),6)
})
test('all eight independent views are required and weapon hand cannot change',()=>{
 const view = i=>({direction:i,grip:[.3,.5],sourceAngle:1,weaponHand:'right',body:'body-'+i,weapon:'weapon-'+i});const views=Array.from({length:8},(_,i)=>view(i));assert.equal(rig.validateViews(views,'right').length,8);assert.throws(()=>rig.validateViews(views.slice(0,7),'right'));assert.throws(()=>rig.validateViews([...views.slice(0,7),view(0)],'right'));assert.throws(()=>rig.validateViews([...views.slice(0,7),{...view(7),weaponHand:'left'}],'right'))
})
test('VFX follows release and respects reduced motion and flashing',()=>{
 const a={pose:'attack',phase:.1,aim:1,special:false,reducedMotion:false};assert.ok(rig.sampleRigVfx(a,false).slash>0);assert.equal(rig.sampleRigVfx(a,true).flash,0);assert.equal(rig.sampleRigVfx({...a,reducedMotion:true},false).slash,0);assert.equal(rig.sampleRigVfx({...a,pose:'idle'},false).slash,0)
})
