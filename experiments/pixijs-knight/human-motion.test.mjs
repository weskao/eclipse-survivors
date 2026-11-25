import {test} from 'node:test'
import assert from 'node:assert/strict'
import {solveChain, mapSegment, sampleHumanPose, createHumanSkin, deformHumanSkin} from './human-motion.mjs'
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`)
const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const profile={width:108,height:134,armJoints:{weapon:[[.35,.2],[.28,.34],[.24,.48]],support:[[.66,.2],[.72,.34],[.74,.48]]},legJoints:{left:[[.43,.51],[.39,.69],[.35,.89]],right:[[.57,.51],[.61,.69],[.65,.89]]},regions:[[.28,.34,.16,.2],[.74,.48,.18,.19],[.72,.34,.17,.2],[.5,.35,.3,.3],[.5,.08,.19,.2],[.39,.69,.17,.2],[.35,.89,.17,.17],[.61,.69,.17,.2],[.65,.89,.17,.17],[.8,.5,.25,.32]]}
const base={pose:'idle',phase:0,step:0,stride:0,heading:0,aim:0,reducedMotion:false,actionStage:'none'}
test('two-bone chain retains both lengths at unreachable targets and exact neutral',()=>{const rest=[[0,0],[4,3],[8,0]];assert.deepEqual(solveChain(rest,rest[2]),rest);for(const t of [[50,0],[0,0],[-8,2],[3,7]]){const s=solveChain(rest,t);close(len(s[0],s[1]),5);close(len(s[1],s[2]),5)}})
test('rigid segment rotations preserve distances and move the elbow with the shoulder',()=>{const p=mapSegment([3,2],[0,0],[5,0],[10,10],[10,15]);close(p[0],8);close(p[1],13);close(len(p,[10,10]),Math.hypot(3,2))})
test('attack engages shoulder and elbow as well as hand, and recovers to authored rest',()=>{const idle=sampleHumanPose(profile,base),hit=sampleHumanPose(profile,{...base,pose:'attack',phase:0,aim:0}),end=sampleHumanPose(profile,{...base,pose:'attack',phase:1,aim:0});assert.ok(len(hit.weapon[0],idle.weapon[0])>1);assert.ok(len(hit.weapon[1],idle.weapon[1])>2);assert.ok(len(hit.weapon[2],idle.weapon[2])>4);for(let i=0;i<3;i++)close(len(end.weapon[i],idle.weapon[i]),0);close(len(hit.weapon[0],hit.weapon[1]),len(idle.weapon[0],idle.weapon[1]));close(len(hit.weapon[1],hit.weapon[2]),len(idle.weapon[1],idle.weapon[2]))})
test('moving attack maintains independent gait, reduced motion restores exact authored mesh',()=>{const run={...base,pose:'run',step:1.2,stride:1,heading:0};const walk=sampleHumanPose(profile,run),attack=sampleHumanPose(profile,{...run,pose:'attack',phase:0});assert.ok(len(walk.left[2],walk.right[2])>5);assert.ok(len(attack.left[2],walk.left[2])<5);const rest=new Float32Array([20,45,50,60,38,115,72,105]);const skin=createHumanSkin(rest,profile),out=new Float32Array(rest.length);deformHumanSkin(skin,out,attack);assert.notDeepEqual(out,rest);assert.ok(out.every(Number.isFinite));deformHumanSkin(skin,out,sampleHumanPose(profile,{...run,reducedMotion:true}));assert.deepEqual(out,rest)})

test('knee hinge has a stable bend pole and bounded flexion even at unreachable targets',()=>{
 const rest=[[0,0],[4,3],[8,0]],rad=Math.PI/180
 for(const target of [[100,0],[.01,0],[-8,3],[0,-10]]){
  const s=solveChain(rest,target,{minFlex:5*rad,maxFlex:75*rad,bend:-1})
  const a=s[1].map((v,i)=>v-s[0][i]),b=s[2].map((v,i)=>v-s[1][i])
  const flex=Math.acos(Math.max(-1,Math.min(1,(a[0]*b[0]+a[1]*b[1])/25)))
  assert.ok(flex>=5*rad-1e-6&&flex<=75*rad+1e-6)
  assert.ok(a[0]*b[1]-a[1]*b[0]<0)
  close(len(s[0],s[1]),5);close(len(s[1],s[2]),5)
 }
})
test('stance target cancels root travel, while heel and toe phases have independent pitch',async()=>{
 const {sampleFootCycle}=await import('./human-motion.mjs')
 const stride=50
 for(const distance of [2,8,15,22]){
  const a=sampleFootCycle(distance,stride,0,1),b=sampleFootCycle(distance+1,stride,0,1)
  close(a.travel+distance,b.travel+distance+1);close(a.lift,0)
 }
 assert.ok(sampleFootCycle(0,stride,0,1).pitch<0)
 assert.ok(sampleFootCycle(27,stride,0,1).pitch>0)
 assert.ok(sampleFootCycle(39,stride,0,1).lift>0)
 assert.equal(sampleFootCycle(20,stride,0,0).pitch,0)
})
test('sword contact, follow-through and recovery share one arc',async()=>{
 const {sampleSwordArc}=await import('./human-motion.mjs')
 const start=sampleSwordArc({...base,pose:'attack',phase:0}),follow=sampleSwordArc({...base,pose:'attack',phase:.32}),end=sampleSwordArc({...base,pose:'attack',phase:1})
 close(start.angle,0);assert.ok(follow.angle>0);close(end.angle,0);close(end.extension,0)
 const prep=sampleSwordArc({...base,actionStage:'windup',windupProgress:.5})
 assert.ok(prep.angle<0&&prep.angle>-.65)
})
test('foot bone rotates around a real ankle, keeps its own length, and does not change rest mesh',()=>{
 const p={...profile,footJoints:{left:{heel:[.33,.93],toe:[.42,.93]},right:{heel:[.63,.93],toe:[.72,.93]}}}
 const rest=sampleHumanPose(p,base),moving=sampleHumanPose(p,{...base,pose:'run',stride:1,step:1,heading:0})
 for(const k of ['left','right']){assert.ok(moving.feet[k]);close(len(moving.feet[k].heel,moving.feet[k].toe),len(rest.feet[k].heel,rest.feet[k].toe));assert.ok(Number.isFinite(moving.feet[k].pitch))}
 const v=new Float32Array([36,124,43,125,68,124,76,125]),skin=createHumanSkin(v,p),out=new Float32Array(v.length)
 deformHumanSkin(skin,out,rest);assert.deepEqual(out,v)
 deformHumanSkin(skin,out,moving);assert.ok(out.every(Number.isFinite));assert.notDeepEqual(out,v)
})

test('projected sagittal knee bends forward in side views and into depth in front/back views',async()=>{
 const {solveProjectedLeg}=await import('./human-motion.mjs')
 const rest=[[0,0],[0,10],[0,20]],target=[0,16]
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,r=solveProjectedLeg(rest,target,a,1,{minFlex:0,maxFlex:Math.PI/2})
  const len3=(j,k)=>Math.hypot(r.points[j][0]-r.points[k][0],r.points[j][1]-r.points[k][1],r.depth[j]-r.depth[k])
  close(len3(0,1),10);close(len3(1,2),10)
  close(r.points[1][0],6*Math.cos(a));close(r.depth[1],6*Math.sin(a))
 }
})
test('projected shin can foreshorten without moving the ankle attachment away from its solved joint',async()=>{
 const {mapProjectedSegment}=await import('./human-motion.mjs')
 const a=[0,0],b=[0,10],c=[3,4],d=[6,10]
 const p=mapProjectedSegment(b,a,b,c,d);close(p[0],d[0]);close(p[1],d[1])
 const q=mapProjectedSegment([2,0],a,b,c,d);close(len(q,c),2)
})

test('Knight full-speed cadence avoids seven footfalls per second without changing movement speed',async()=>{
 const {advanceHumanGait}=await import('./human-motion.mjs')
 let gait=advanceHumanGait(null,{step:0,clock:0,vx:190,vy:0,pose:'run'},134)
 for(let i=1;i<=120;i++)gait=advanceHumanGait(gait,{step:(190*i/120)/18,clock:i/120,vx:190,vy:0,pose:'run'},134)
 assert.ok(gait.cycle*2>2.5&&gait.cycle*2<4.2)
 assert.ok(gait.stance<.5&&gait.strideLength>90)
})
test('gait phase is continuous when changing speed or attacking, and dash does not machine-step',async()=>{
 const {advanceHumanGait}=await import('./human-motion.mjs')
 const a=advanceHumanGait(null,{step:0,clock:0,vx:60,vy:0,pose:'run'},134)
 const b=advanceHumanGait(a,{step:1/18,clock:.016,vx:60,vy:0,pose:'run'},134)
 const c=advanceHumanGait(b,{step:3/18,clock:.032,vx:125,vy:0,pose:'attack'},134)
 assert.ok(a.stance>.55);assert.ok(c.cycle>b.cycle&&c.cycle-b.cycle<.06)
 const dash=advanceHumanGait(c,{step:12/18,clock:.048,vx:500,vy:0,pose:'dash'},134)
 close(dash.cycle,c.cycle);close(dash.strength,0)
})

test('long run stride lowers pelvis to keep the support leg within reach',()=>{
 const p={...profile,viewAngle:0},gait={cycle:0,strideLength:120,stance:.48,strength:1}
 const pose=sampleHumanPose(p,{...base,pose:'run',stride:1,heading:Math.PI,gait})
 const hip=pose.left[0],restHip=p.legJoints.left[0].map((v,i)=>v*(i?p.height:p.width))
 assert.ok(hip[1]-restHip[1]>3)
 const leg=pose.left;assert.ok(len(leg[0],leg[2])<=len(restHip,p.legJoints.left[1].map((v,i)=>v*(i?p.height:p.width)))+len(p.legJoints.left[1].map((v,i)=>v*(i?p.height:p.width)),p.legJoints.left[2].map((v,i)=>v*(i?p.height:p.width)))+1e-5)
})
