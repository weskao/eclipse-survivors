import { Application, Container, Graphics, MeshPlane, Sprite, Texture } from 'pixi.js'
import { getRigidWeaponLayers } from '../../src/game/render/rigid-weapons.ts'
import { sampleWeaponRig } from '../../src/game/render/weapon-rig.ts'
import { advanceRigMotion, createRigSkin, deformRig, meshPoint, movementSlot } from './motion.mjs'
import { loadDirectionalAssets } from './rig-assets.mjs'
import { needsRigRender } from './frame-policy.mjs'
import { KNIGHT_RIG, defineRig, facingFor, validateViews, sampleRigVfx } from './rig.mjs'


// DEV actor-only GPU compositing, NOT a second game loop. Actual texture quality
// and Canvas/GPU copy cost must be measured before promoting this architecture.
export async function createHeroPixi(image, report, { profile = KNIGHT_RIG, job = 'knight', directionalLayers } = {}) {
  profile=defineRig(profile)
  const W=profile.width,H=profile.height,WIDTH=Math.ceil(W*2.5),HEIGHT=Math.ceil(H*1.85),FOOT_X=WIDTH/2,FOOT_Y=HEIGHT-H*.4
  // Directional art does not require decoding/cutting the legacy master.
  const layers=directionalLayers?null:await image.decode().then(()=>getRigidWeaponLayers(image,job))
  if(!directionalLayers&&!layers)return null
  const app=new Application()
  // Match the effective presentation density; retain 3x source textures unchanged.
  // Explicit fixed density 3 is available for visual comparison, not the default.
  const requested=new URLSearchParams(location.search).get('knightRigResolution')
  const resolution=requested==='3'?3:Math.max(1,Math.min(3,window.devicePixelRatio||1))
  await app.init({width:WIDTH,height:HEIGHT,resolution,backgroundAlpha:0,preference:'webgl',
    autoStart:false,sharedTicker:false,preserveDrawingBuffer:true})
  let disposed=false,failed=false,reported=false,old=null,owner=null,facing=0,active=null,previousFrame=null,renderCount=0
  const diagnostics=new URLSearchParams(location.search).get('knightPixiQA')==='1'
  try {
    const root=new Container()
    root.position.set(FOOT_X,FOOT_Y)
    app.stage.addChild(root)
    // Static local VFX geometry is created once; only transform/alpha changes per draw.
    const dashFx=new Graphics().ellipse(0,0,38,10).stroke({color:0x99d7ff,width:2,alpha:.55})
    const slashFx=new Graphics().arc(0,0,34,-.9,.75).stroke({color:0xffd17b,width:4,alpha:.8}).arc(0,0,34,-.8,.65).stroke({color:0xfff5cf,width:1.5})
    const specialFx=new Graphics().circle(0,0,42).stroke({color:0xe8c06a,width:2,alpha:.7}).circle(0,0,35).stroke({color:0xffdf9e,width:1})
    root.addChild(dashFx)
    dashFx.visible=slashFx.visible=specialFx.visible=false
    function createView(layer, viewProfile, anchor=[.5,1]) {
      const group=new Container()
      const body=new MeshPlane({texture:Texture.from(layer.body),verticesX:11,verticesY:13})
      body.autoResize=false
      body.position.set(-W*anchor[0],-H*anchor[1]+4)
      const buffer=body.geometry.getBuffer('aPosition'), vertices=buffer.data
      const rest=new Float32Array(vertices.length)
      for(let i=0;i<vertices.length;i+=2){
        rest[i]=vertices[i]*W/layer.body.width
        rest[i+1]=vertices[i+1]*H/layer.body.height
      }
      const skin=createRigSkin(rest,W,H,layer.grip,viewProfile)
      const weapon=new Sprite(Texture.from(layer.weapon))
      weapon.anchor.set(...layer.grip)
      group.addChild(body,weapon)
      group.visible=false
      root.addChild(group)
      return {group,body,buffer,vertices,skin,weapon,layer,profile:viewProfile}
    }
    // A second hero supplies its own validated rig profile and same-handed native layers.
    // Directional textures are opt-in and loaded once, never created per frame.
    const views=directionalLayers ? validateViews(directionalLayers.map(v=>v.meta),profile.weaponHand).map(meta=>{
      const v=directionalLayers.find(x=>x.meta.direction===meta.direction)
      return createView(v.layers,defineRig({...profile,...v.profile,id:profile.id,sourceAngle:meta.sourceAngle}),meta.footAnchor)
    }) : null
    const fallback=views?null:createView(layers,profile)
    root.addChild(slashFx,specialFx)
    const canvas=app.canvas
    const onLost=event=>{event.preventDefault();failed=true;report('canvas')}
    canvas.addEventListener('webglcontextlost',onLost)
    return {
      draw(ctx,hero,anim,clock,frozen,reduceFlashing=false){
        if(disposed||failed||document.hidden)return false
        try {
          if(owner!==hero){old=null;previousFrame=null;owner=hero;facing=0}
          const desired=facingFor(profile,{pose:anim.pose,slot:movementSlot(hero.vx,hero.vy,hero.moveAmount),heading:Math.atan2(hero.vy,hero.vx),aim:hero.aimAngle},facing)
          const frame={...anim,clock,reduceFlashing,view:views?desired:0,aim:hero.aimAngle}
          if(needsRigRender(previousFrame,frame,frozen)){
            // Never mirror the source sword. Reuse the existing arm IK in its unmirrored coordinate system.
            const model={...hero,face:1}
            const rig=sampleWeaponRig(job,model,anim)
            const idle=sampleWeaponRig(job,model,{...anim,pose:'idle',phase:0})
            const input={...anim,clock,vx:hero.vx,vy:hero.vy,move:hero.moveAmount,
              step:hero.step,aim:hero.aimAngle,handX:rig.hand.x-idle.hand.x,handY:rig.hand.y-idle.hand.y,
              elbowX:rig.elbow.x-idle.elbow.x,elbowY:rig.elbow.y-idle.elbow.y,
              supportX:rig.supportHand.x-idle.supportHand.x,supportY:rig.supportHand.y-idle.supportHand.y,
              supportElbowX:rig.supportElbow.x-idle.supportElbow.x,supportElbowY:rig.supportElbow.y-idle.supportElbow.y}
            // Facing follows travel input rather than lingering in a previous octant.
            // Bone motion itself is blended across direction and action transitions.
            facing=frozen&&previousFrame?facing:desired
            const selected=views?views[facing]:fallback
            if(active!==selected){if(active)active.group.visible=false;selected.group.visible=true;active=selected}
            const current=advanceRigMotion(old,input,selected.profile)
            const {body,vertices,skin,buffer,weapon:sword,layer}=selected
            deformRig(skin,vertices,current)
            buffer.update()
            const grip=meshPoint(vertices,11,13,...layer.grip)
            sword.position.set(body.position.x+grip.x,body.position.y+grip.y)
            sword.scale.set(H/layer.weapon.height)
            sword.rotation=current.blade
            // GPU sprite tint is a local feedback effect, no full-screen flashing or extra filter pass.
            const effect=sampleRigVfx(anim,reduceFlashing)
            sword.tint=effect.flash>0?0xffdfa7:0xffffff
            slashFx.visible=effect.slash>0
            slashFx.alpha=effect.slash
            slashFx.position.copyFrom(sword.position)
            slashFx.rotation=hero.aimAngle
            dashFx.visible=effect.dash>0
            dashFx.alpha=effect.dash
            dashFx.rotation=current.heading
            dashFx.scale.set(1+(1-effect.dash)*.3,1)
            specialFx.visible=effect.special>0
            specialFx.alpha=effect.special
            specialFx.position.set(0,-H*.45)
            specialFx.scale.set(.8+effect.special*.3)
            app.render()
            old={...current,reduceFlashing}
            previousFrame={...frame,view:views?facing:0}
            renderCount++
          }
          ctx.drawImage(canvas,-FOOT_X,-FOOT_Y,WIDTH,HEIGHT)
          if(diagnostics&&ctx.canvas?.dataset){
            const d=ctx.canvas.dataset
            if(d.knightRigResolution!==String(resolution))d.knightRigResolution=String(resolution)
            const view=views?String(facing):'single', count=String(renderCount), pose=previousFrame.pose
            if(d.knightRigAssets!==(views?'directional':'legacy'))d.knightRigAssets=views?'directional':'legacy'
            if(d.knightRigView!==view)d.knightRigView=view
            if(d.knightRigPose!==pose)d.knightRigPose=pose
            if(d.knightRigRenders!==count)d.knightRigRenders=count
          }
          if(!reported){reported=true;report('pixi')}
          return true
        } catch(error){console.warn('Knight GPU rendering failed',error);failed=true;report('canvas');return false}
      },
      dispose(){
        if(disposed)return
        disposed=true
        canvas.removeEventListener('webglcontextlost',onLost)
        app.destroy(true,{children:true,texture:true,textureSource:true})
      }
    }
  }catch(error){app.destroy(true,{children:true,texture:true,textureSource:true});throw error}
}

// The optional imported candidate remains outside the production build. Missing or
// invalid art never prevents the original single-view candidate from working.
export async function createKnightPixi(image,report) {
  let directionalLayers
  const candidateQuery=new URLSearchParams(location.search).get('knightRigCandidates')
  if(candidateQuery==='1'||(candidateQuery===null&&import.meta.env.DEV&&import.meta.env.VITE_ES2_KNIGHT_PIXI==='directional')){
    try{
      const manifests=import.meta.glob('./assets/knight/manifest.json',{eager:true,import:'default'})
      const urls=import.meta.glob('./assets/knight/*.webp',{eager:true,query:'?url',import:'default'})
      const manifest=manifests['./assets/knight/manifest.json']
      if(!manifest)throw new Error('Knight candidate asset manifest missing')
      directionalLayers=await loadDirectionalAssets(manifest,KNIGHT_RIG,async name=>{
        const url=urls['./assets/knight/'+name]
        if(typeof url!=='string')throw new Error('Missing rig layer '+name)
        const layer=new Image()
        layer.src=url
        await layer.decode()
        return layer
      },{allowCandidate:true})
    }catch(error){console.warn('Knight directional candidate rejected; original source retained',error)}
  }
  return createHeroPixi(image,report,{directionalLayers})
}
