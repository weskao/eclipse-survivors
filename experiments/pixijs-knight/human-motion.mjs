const TAU=2*Math.PI,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{const t=clamp(x);return t*t*(3-2*t)}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const angle=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const keys=['weapon','support','left','right']
// Solve in the authored view's plane; preserve length and original elbow/knee bend.
export function solveChain(rest,target,limits){
 const [a,b,c]=rest,upper=distance(a,b),lower=distance(b,c)
 if(distance(c,target)<1e-7)return rest.map(p=>p.slice())
 const v=sub(target,a),l=Math.hypot(...v)
 const reach=flex=>Math.sqrt(Math.max(0,upper*upper+lower*lower+2*upper*lower*Math.cos(flex)))
 const near=limits?reach(limits.maxFlex):Math.abs(upper-lower)+1e-6,far=limits?reach(limits.minFlex):upper+lower-1e-6
 const d=Math.max(1e-6,near,Math.min(far,l))
 const q=l>1e-7?[v[0]/l,v[1]/l]:[Math.cos(angle(a,c)),Math.sin(angle(a,c))]
 const along=(upper*upper+d*d-lower*lower)/(2*d),bend=limits?.bend??(Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))||1)
 const h=Math.sqrt(Math.max(0,upper*upper-along*along))*bend
 return [a.slice(),[a[0]+q[0]*along+q[1]*h,a[1]+q[1]*along-q[0]*h],[a[0]+q[0]*d,a[1]+q[1]*d]]
}
function segmentTransform(a,b,c,d){const r=angle(c,d)-angle(a,b),cos=Math.cos(r),sin=Math.sin(r);return [cos,sin,c[0]-a[0]*cos+a[1]*sin,c[1]-a[0]*sin-a[1]*cos]}
function apply(t,p){return [t[0]*p[0]-t[1]*p[1]+t[2],t[1]*p[0]+t[0]*p[1]+t[3]]}
export function mapSegment(p,a,b,c,d){return apply(segmentTransform(a,b,c,d),p)}
function restChains(profile){return Object.fromEntries(keys.map(k=>[k,(profile.armJoints?.[k]??profile.legJoints[k]).map(([x,y])=>[x*profile.width,y*profile.height])]))}
// Distance-driven contact curve: stance cancels root displacement at full gait.
export function sampleFootCycle(distance,strideLength,side,stride){
 const u=((distance/strideLength+side*.5)%1+1)%1,stance=.6
 const t=clamp((u-stance)/(1-stance)),travel=u<stance?strideLength*(stance/2-u):strideLength*stance*(ease(t)-.5)
 const lift=u<stance?0:Math.sin(Math.PI*t)**2
 const pitch=u<.12?-.22*(1-ease(u/.12)):u<.45?0:u<stance?.42*ease((u-.45)/.15):.42*(1-ease(t))-.22*ease(t)
 return {travel:travel*stride,lift:lift*stride,pitch:pitch*stride,phase:u,planted:u<stance}
}
export function sampleSwordArc(p){
 const t=clamp(p.phase),attack=p.pose==='attack'||p.pose==='cast'
 if(attack)return {angle:t===0||t===1?0:.60*Math.sin(Math.PI*ease(t)),extension:1-ease(t),recovery:ease(clamp((t-.28)/.72))}
 const prep=p.actionStage==='windup'?clamp(p.windupProgress??.5):p.actionStage==='hold'?1:0
 return {angle:-.60*ease(prep),extension:-.30*ease(prep),recovery:1}
}
const radians=n=>n*Math.PI/180
function limitsFor(chain,leg){
 const [a,b,c]=chain,ab=sub(b,a),bc=sub(c,b)
 const restFlex=Math.acos(Math.max(-1,Math.min(1,(ab[0]*bc[0]+ab[1]*bc[1])/(Math.hypot(...ab)*Math.hypot(...bc)))))
 return {minFlex:Math.min(radians(leg?4:8),restFlex),maxFlex:Math.max(radians(leg?78:135),restFlex),bend:Math.sign(ab[0]*bc[1]-ab[1]*bc[0])||1}
}
const rotateVector=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)]
function footRest(profile,k,ankle){
 const foot=profile.footJoints?.[k]
 return foot?{heel:foot.heel.map((x,i)=>x*(i?profile.height:profile.width)),toe:foot.toe.map((x,i)=>x*(i?profile.height:profile.width))}:{heel:add(ankle,[-profile.width*.025,profile.height*.035]),toe:add(ankle,[profile.width*.055,profile.height*.035])}
}
function bootPose(foot,restAnkle,ankle,pitch){return {heel:add(ankle,rotateVector(sub(foot.heel,restAnkle),pitch)),toe:add(ankle,rotateVector(sub(foot.toe,restAnkle),pitch)),pitch}}
export function sampleHumanPose(profile,p,rest=restChains(profile)){
 const w=profile.width,h=profile.height,phase=clamp(p.phase),stride=clamp(p.stride),dir=[Math.cos(p.heading),Math.sin(p.heading)],aim=[Math.cos(p.aim),Math.sin(p.aim)]
 const attack=p.pose==='attack'||p.pose==='cast',arc=sampleSwordArc(p),strike=Math.max(0,arc.extension),windup=Math.max(0,-arc.extension)
 const cycle=p.step*18/(h*.39),a=sampleFootCycle(p.step*18,h*.39,0,stride),b=sampleFootCycle(p.step*18,h*.39,1,stride)
 const pelvis=[(rest.left[0][0]+rest.right[0][0])/2,(rest.left[0][1]+rest.right[0][1])/2]
 if(p.reducedMotion)return {...rest,root:[1,0,0,0],cape:0,feet:{left:bootPose(footRest(profile,'left',rest.left[2]),rest.left[2],rest.left[2],0),right:bootPose(footRest(profile,'right',rest.right[2]),rest.right[2],rest.right[2],0)},blade:0,reducedMotion:true}
 const roll=dir[0]*stride*.09+aim[0]*(strike-windup)*.10
 const bob=-(a.lift+b.lift)*h*.014+stride*h*.018
 const shift=[dir[0]*stride*w*.018+aim[0]*(strike-windup)*w*.045,bob+aim[1]*(strike-windup)*h*.023]
 if(p.pose==='hurt')shift[0]-=aim[0]*(1-phase)*w*.04
 if(p.pose==='dash')shift[0]+=dir[0]*(1-phase)*w*.04
 if(p.pose==='death')shift[1]+=phase*h*.08
 if(p.pose==='victory')shift[1]-=Math.sin(phase*Math.PI)*h*.03
 const c=Math.cos(roll),s=Math.sin(roll),root=[c,s,pelvis[0]+shift[0]-pelvis[0]*c+pelvis[1]*s,pelvis[1]+shift[1]-pelvis[0]*s-pelvis[1]*c]
 const contact=Math.atan2(Math.sin(p.aim-(profile.sourceAngle??p.aim)),Math.cos(p.aim-(profile.sourceAngle??p.aim)))
 const result={root,cape:Math.sin(cycle*TAU-.8)*stride*h*.025,feet:{},blade:attack?contact*(1-arc.recovery)+arc.angle:arc.angle,reducedMotion:false,neutral:stride===0&&arc.extension===0&&arc.angle===0&&['idle','run','attack','cast'].includes(p.pose)}
 for(const k of keys){
  const chain=rest[k],origin=apply(root,chain[0]),delta=sub(origin,chain[0]),leg=k==='left'||k==='right'
  const g=k==='left'?a:b, swing=leg?g:k==='weapon'?b:a
  let target
  let foot,pitch=0
  if(leg){
   foot=footRest(profile,k,chain[2]);pitch=swing.pitch*Math.cos(p.heading)
   const contactPoint=swing.pitch>0?foot.toe:foot.heel,lever=sub(contactPoint,chain[2]),rolled=rotateVector(lever,pitch)
   target=add(chain[2],[dir[0]*swing.travel+lever[0]-rolled[0],dir[1]*swing.travel-swing.lift*h*.065+lever[1]-rolled[1]])
  }else{
   const side=k==='weapon'?1:-1,reach=k==='weapon'?w*.22:w*.09,extension=(strike-windup)*side*reach
   const swingAim=rotateVector(aim,arc.angle*side)
   target=add(apply(root,chain[2]),[dir[0]*swing.travel*.20+swingAim[0]*extension,dir[1]*swing.travel*.13+swingAim[1]*extension-strike*h*.025])
  }
  result[k]=solveChain(chain,sub(target,delta),limitsFor(chain,leg)).map(p=>add(p,delta))
  if(leg)result.feet[k]=bootPose(foot,chain[2],result[k][2],pitch)
 }
 return result
}
function segmentDistance(p,a,b){const x=b[0]-a[0],y=b[1]-a[1],t=clamp(((p[0]-a[0])*x+(p[1]-a[1])*y)/Math.max(1e-8,x*x+y*y));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y)}
export function createHumanSkin(vertices,profile){
 const rest=vertices.slice(),chains=restChains(profile),weights=new Float32Array(rest.length/2*12),radius=profile.width*.13
 for(let i=0;i<rest.length;i+=2){const p=[rest[i],rest[i+1]],j=i/2*12;let sum=0
  for(let k=0;k<keys.length;k++){const chain=chains[keys[k]];for(let n=0;n<2;n++){const value=Math.max(0,1-segmentDistance(p,chain[n],chain[n+1])/radius)**2;weights[j+k*2+n]=value;sum+=value}}
  const [x,y,rx,ry]=profile.regions[9],cape=Math.max(0,1-Math.hypot((p[0]/profile.width-x)/rx,(p[1]/profile.height-y)/ry))**2
  weights[j+8]=cape*.35;weights[j+9]=Math.max(.08,1-Math.min(1,sum));sum+=weights[j+8]+weights[j+9]
  for(let k=0;k<10;k++)weights[j+k]/=sum
  const boot=['left','right'].map(k=>{const ankle=chains[k][2],foot=footRest(profile,k,ankle);return p[1]<ankle[1]-profile.height*.025?0:Math.max(0,1-segmentDistance(p,foot.heel,foot.toe)/(profile.height*.075))})
  const total=Math.max(1,boot[0]+boot[1]),mix=Math.min(1,boot[0]+boot[1])
  for(let k=0;k<10;k++)weights[j+k]*=1-mix
  weights[j+10]=boot[0]/total;weights[j+11]=boot[1]/total
 }
 return {rest,chains,weights,profile}
}
export function deformHumanSkin(skin,out,pose){
 const {rest,chains,weights}=skin
 if(pose.reducedMotion||pose.neutral){out.set(rest);return}
 const transforms=[]
 for(const k of keys)for(let i=0;i<2;i++)transforms.push(segmentTransform(chains[k][i],chains[k][i+1],pose[k][i],pose[k][i+1]))
 transforms.push([pose.root[0],pose.root[1],pose.root[2]+pose.cape,pose.root[3]],pose.root)
 for(const k of ['left','right']){const f=footRest(skin.profile,k,chains[k][2]);transforms.push(segmentTransform(f.heel,f.toe,pose.feet[k].heel,pose.feet[k].toe))}
 for(let i=0;i<rest.length;i+=2){const x=rest[i],y=rest[i+1],j=i/2*12;let ox=0,oy=0
  for(let k=0;k<12;k++){const t=transforms[k],w=weights[j+k];ox+=(t[0]*x-t[1]*y+t[2])*w;oy+=(t[1]*x+t[0]*y+t[3])*w}
  out[i]=ox;out[i+1]=oy
 }
}
