const TAU=2*Math.PI,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{const t=clamp(x);return t*t*(3-2*t)}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const angle=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const keys=['weapon','support','left','right']
// Solve in the authored view's plane; preserve length and original elbow/knee bend.
export function solveChain(rest,target){
 const [a,b,c]=rest,upper=distance(a,b),lower=distance(b,c)
 if(distance(c,target)<1e-7)return rest.map(p=>p.slice())
 const v=sub(target,a),l=Math.hypot(...v),d=Math.max(Math.abs(upper-lower)+1e-6,Math.min(upper+lower-1e-6,l))
 const q=l>1e-7?[v[0]/l,v[1]/l]:[Math.cos(angle(a,c)),Math.sin(angle(a,c))]
 const along=(upper*upper+d*d-lower*lower)/(2*d),bend=Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))||1
 const h=Math.sqrt(Math.max(0,upper*upper-along*along))*bend
 return [a.slice(),[a[0]+q[0]*along+q[1]*h,a[1]+q[1]*along-q[0]*h],[a[0]+q[0]*d,a[1]+q[1]*d]]
}
function segmentTransform(a,b,c,d){const r=angle(c,d)-angle(a,b),cos=Math.cos(r),sin=Math.sin(r);return [cos,sin,c[0]-a[0]*cos+a[1]*sin,c[1]-a[0]*sin-a[1]*cos]}
function apply(t,p){return [t[0]*p[0]-t[1]*p[1]+t[2],t[1]*p[0]+t[0]*p[1]+t[3]]}
export function mapSegment(p,a,b,c,d){return apply(segmentTransform(a,b,c,d),p)}
function restChains(profile){return Object.fromEntries(keys.map(k=>[k,(profile.armJoints?.[k]??profile.legJoints[k]).map(([x,y])=>[x*profile.width,y*profile.height])]))}
function gait(cycle,side,stride){const u=((cycle+side*.5)%1+1)%1;return {travel:(u<.6?1-2*u/.6:-1+2*ease((u-.6)/.4))*stride,lift:(u<.6?0:Math.sin(Math.PI*(u-.6)/.4)**2)*stride}}
export function sampleHumanPose(profile,p,rest=restChains(profile)){
 const w=profile.width,h=profile.height,phase=clamp(p.phase),stride=clamp(p.stride),dir=[Math.cos(p.heading),Math.sin(p.heading)],aim=[Math.cos(p.aim),Math.sin(p.aim)]
 const attack=p.pose==='attack'||p.pose==='cast',strike=attack?1-ease(phase):0,windup=!attack&&p.actionStage==='windup'?.3:0
 const cycle=p.step*18/(h*.39),a=gait(cycle,0,stride),b=gait(cycle,1,stride)
 const pelvis=[(rest.left[0][0]+rest.right[0][0])/2,(rest.left[0][1]+rest.right[0][1])/2]
 if(p.reducedMotion)return {...rest,root:[1,0,0,0],cape:0,reducedMotion:true}
 const roll=dir[0]*stride*.09+aim[0]*(strike-windup)*.10
 const bob=-(a.lift+b.lift)*h*.022
 const shift=[dir[0]*stride*w*.018+aim[0]*(strike-windup)*w*.045,bob+aim[1]*(strike-windup)*h*.023]
 if(p.pose==='hurt')shift[0]-=aim[0]*(1-phase)*w*.04
 if(p.pose==='dash')shift[0]+=dir[0]*(1-phase)*w*.04
 if(p.pose==='death')shift[1]+=phase*h*.08
 if(p.pose==='victory')shift[1]-=Math.sin(phase*Math.PI)*h*.03
 const c=Math.cos(roll),s=Math.sin(roll),root=[c,s,pelvis[0]+shift[0]-pelvis[0]*c+pelvis[1]*s,pelvis[1]+shift[1]-pelvis[0]*s-pelvis[1]*c]
 const result={root,cape:Math.sin(cycle*TAU-.8)*stride*h*.025,reducedMotion:false}
 for(const k of keys){
  const chain=rest[k],origin=apply(root,chain[0]),delta=sub(origin,chain[0]),leg=k==='left'||k==='right'
  const g=k==='left'?a:b, swing=leg?g:k==='weapon'?b:a
  let target
  if(leg){const reach=h*.39*.6/2;target=add(chain[2],[dir[0]*swing.travel*reach,dir[1]*swing.travel*reach-swing.lift*h*.065])}
  else{const side=k==='weapon'?1:-1,reach=k==='weapon'?w*.22:w*.09,extension=(strike-windup)*side*reach,follow=attack?Math.sin(phase*Math.PI)*w*.035:0
   target=add(apply(root,chain[2]),[dir[0]*swing.travel*w*.055+aim[0]*extension-aim[1]*follow,dir[1]*swing.travel*w*.035+aim[1]*extension-aim[0]*follow-strike*h*.025])}
  result[k]=solveChain(chain,sub(target,delta)).map(p=>add(p,delta))
 }
 return result
}
function segmentDistance(p,a,b){const x=b[0]-a[0],y=b[1]-a[1],t=clamp(((p[0]-a[0])*x+(p[1]-a[1])*y)/Math.max(1e-8,x*x+y*y));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y)}
export function createHumanSkin(vertices,profile){
 const rest=vertices.slice(),chains=restChains(profile),weights=new Float32Array(rest.length/2*10),radius=profile.width*.13
 for(let i=0;i<rest.length;i+=2){const p=[rest[i],rest[i+1]],j=i/2*10;let sum=0
  for(let k=0;k<keys.length;k++){const chain=chains[keys[k]];for(let n=0;n<2;n++){const value=Math.max(0,1-segmentDistance(p,chain[n],chain[n+1])/radius)**2;weights[j+k*2+n]=value;sum+=value}}
  const [x,y,rx,ry]=profile.regions[9],cape=Math.max(0,1-Math.hypot((p[0]/profile.width-x)/rx,(p[1]/profile.height-y)/ry))**2
  weights[j+8]=cape*.35;weights[j+9]=Math.max(.08,1-Math.min(1,sum));sum+=weights[j+8]+weights[j+9]
  for(let k=0;k<10;k++)weights[j+k]/=sum
 }
 return {rest,chains,weights,profile}
}
export function deformHumanSkin(skin,out,pose){
 const {rest,chains,weights}=skin
 if(pose.reducedMotion){out.set(rest);return}
 const transforms=[]
 for(const k of keys)for(let i=0;i<2;i++)transforms.push(segmentTransform(chains[k][i],chains[k][i+1],pose[k][i],pose[k][i+1]))
 transforms.push([pose.root[0],pose.root[1],pose.root[2]+pose.cape,pose.root[3]],pose.root)
 for(let i=0;i<rest.length;i+=2){const x=rest[i],y=rest[i+1],j=i/2*10;let ox=0,oy=0
  for(let k=0;k<10;k++){const t=transforms[k],w=weights[j+k];ox+=(t[0]*x-t[1]*y+t[2])*w;oy+=(t[1]*x+t[0]*y+t[3])*w}
  out[i]=ox;out[i+1]=oy
 }
}
