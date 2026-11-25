import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as motion from './motion.mjs'
const base = { pose: 'idle', phase: 0, direction: 0, reducedMotion: false, vx: 0, vy: 0, move: 0, step: 0, aim: 0, clock: 0, handX: 0, handY: 0, elbowX: 0, elbowY: 0, supportX: 0, supportY: 0, supportElbowX: 0, supportElbowY: 0 }
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-5, `${a} != ${b}`)
test('eight travel slots and stationary center', () => {
  assert.equal(typeof motion.movementSlot, 'function')
  for (let i=0;i<8;i++) assert.equal(motion.movementSlot(Math.cos(i*Math.PI/4),Math.sin(i*Math.PI/4),1),i)
  assert.equal(motion.movementSlot(0,0,0),8)
})
test('moving and attacking remain independent', () => {
  const p=motion.advanceKnightMotion(null,{...base,pose:'attack',vx:0,vy:-100,move:1,aim:Math.PI,phase:0})
  assert.equal(p.slot,6); close(p.aim,Math.PI); close(p.blade,Math.PI-motion.SOURCE_BLADE_ANGLE)
  assert.equal(p.stride,1)
})
test('shortest turn wraps and movement transitions blend', () => {
  const a=motion.advanceKnightMotion(null,{...base,pose:'run',vx:-100,vy:1,move:1})
  const b=motion.advanceKnightMotion(a,{...base,pose:'run',vx:-100,vy:-1,move:1,clock:.016})
  assert.ok(Math.abs(b.heading-a.heading)<.03)
  const c=motion.advanceKnightMotion(b,{...base,clock:.032})
  assert.ok(c.stride>0&&c.stride<1)
})
test('mesh is deterministic, reduced motion exact, grip stays attached', () => {
  const rest=new Float32Array([0,0,22,50,54,11,40,82,74,95,90,55,100,100]);const skin=motion.createKnightSkin(rest,100,100,[.22,.5]);const output=new Float32Array(rest.length)
  const p=motion.advanceKnightMotion(null,{...base,pose:'attack',phase:0,handX:12,handY:-8})
  motion.deformKnight(skin,output,p); close(output[2],34); close(output[3],42)
  const expected=output.slice();motion.deformKnight(skin,output,{...p,reducedMotion:true});assert.deepEqual(output,rest)
  motion.deformKnight(skin,output,p);assert.deepEqual(output,expected)
})
test('attack recovers smoothly and cannot change gameplay input', () => {
  const input=Object.freeze({...base,pose:'attack',aim:Math.PI/2,phase:1})
  const p=motion.advanceKnightMotion(null,input);close(p.blade,0);assert.equal(input.pose,'attack')
})
test('all remaining pose samples are finite and differ from rest',()=>{
  const rest=new Float32Array([54,11,35,80,73,92,90,55]);const skin=motion.createKnightSkin(rest,100,100,[.22,.5]);const out=new Float32Array(rest.length)
  for(const pose of ['dash','hurt','death','victory','cast']){
    const p=motion.advanceKnightMotion(null,{...base,pose,phase:.35,aim:1,handX:2,handY:-3});motion.deformKnight(skin,out,p)
    assert.ok(out.every(Number.isFinite),pose);assert.notDeepEqual(out,rest,pose)
  }
})
test('both leg chains preserve their segment lengths during a full stride in all directions',()=>{
  assert.equal(typeof motion.sampleLegBones,'function')
  for(let i=0;i<8;i++) for(let j=0;j<16;j++) for(const side of ['left','right']){
    const a=motion.sampleLegBones(side,108,134,0,i*Math.PI/4,0)
    const b=motion.sampleLegBones(side,108,134,j*Math.PI/8,i*Math.PI/4,1)
    const length=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y)
    close(length(a.hip,a.knee),length(b.hip,b.knee));close(length(a.knee,a.foot),length(b.knee,b.foot))
  }
})
test('mesh grip is sampled from the same triangles as the body, not an independent approximation',()=>{
  assert.equal(typeof motion.meshPoint,'function')
  const vertices=new Float32Array([0,0,10,0,0,10,12,15])
  const a=motion.meshPoint(vertices,2,2,.2,.3)
  close(a.x,2);close(a.y,3)
  const b=motion.meshPoint(vertices,2,2,.8,.9)
  close(b.x,9.4);close(b.y,12.5)
})
test('all eight independent attack aims align at contact',()=>{
  for(let i=0;i<8;i++){
    const aim=i*Math.PI/4
    const p=motion.advanceKnightMotion(null,{...base,pose:'attack',aim,phase:0})
    close(Math.cos(p.blade+motion.SOURCE_BLADE_ANGLE),Math.cos(aim))
    close(Math.sin(p.blade+motion.SOURCE_BLADE_ANGLE),Math.sin(aim))
  }
})

test('stance foot moves backwards at constant speed and swing foot clears the ground',()=>{
 const a=motion.sampleGait(0,0,1), b=motion.sampleGait(.2,0,1), c=motion.sampleGait(.4,0,1)
 assert.equal(a.lift,0);assert.equal(b.lift,0);assert.equal(c.lift,0)
 close(b.travel-a.travel,c.travel-b.travel)
 assert.ok(b.travel<a.travel)
 assert.ok(motion.sampleGait(.8,0,1).lift>0)
 close(motion.sampleGait(0,0,0).travel,0)
 close(motion.sampleGait(.8,0,0).lift,0)
 close(motion.sampleGait(0,1,1).travel,motion.sampleGait(.5,0,1).travel)
})
test('gait loops without ankle jumps and attack does not reset the gait',()=>{
 const a=motion.sampleGait(0,0,1), b=motion.sampleGait(1-1e-8,0,1)
 assert.ok(Math.abs(a.travel-b.travel)<1e-4);assert.ok(b.lift<1e-4)
 const run=motion.advanceKnightMotion(null,{...base,pose:'run',step:3,move:1,vx:90})
 const hit=motion.advanceKnightMotion(run,{...base,pose:'attack',step:3.1,move:1,vx:90,clock:.016})
 assert.equal(hit.step,3.1);close(hit.stride,1)
})
test('weapon anticipates only during real windup, aligns at contact and eases back',()=>{
 const input={...base,aim:2.8}
 const idle=motion.advanceKnightMotion(null,input)
 const wind=motion.advanceKnightMotion(idle,{...input,actionStage:'windup',clock:.016})
 assert.ok(wind.blade<0);assert.ok(Math.abs(wind.blade)<=.65)
 const hit=motion.advanceKnightMotion(wind,{...input,pose:'attack',phase:0,clock:.032})
 close(hit.blade,2.8-motion.SOURCE_BLADE_ANGLE)
 const follow=motion.advanceKnightMotion(hit,{...input,pose:'attack',phase:.3,clock:.048})
 assert.ok(follow.blade>hit.blade)
 const end=motion.advanceKnightMotion(follow,{...input,pose:'attack',phase:1,clock:.064})
 close(end.blade,0)
})
test('leg IK remains finite at full extension and has consistent bone lengths',()=>{
 for(const side of ['left','right'])for(let i=0;i<32;i++){
  const a=motion.sampleLegBones(side,108,134,0,0,0)
  const b=motion.sampleLegBones(side,108,134,i*Math.PI/16,Math.PI/3,1)
  const len=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y)
  close(len(a.hip,a.knee),len(b.hip,b.knee));close(len(a.knee,a.foot),len(b.knee,b.foot))
  assert.ok(Number.isFinite(b.foot.x)&&Number.isFinite(b.foot.y))
 }
})
