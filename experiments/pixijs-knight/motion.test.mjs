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
