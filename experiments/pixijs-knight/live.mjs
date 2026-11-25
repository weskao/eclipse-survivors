import { Application, Container, MeshPlane, Sprite, Texture } from 'pixi.js'
import { getRigidWeaponLayers } from '../../src/game/render/rigid-weapons.ts'
import { sampleWeaponRig } from '../../src/game/render/weapon-rig.ts'
import { advanceRigMotion, createRigSkin, deformRig, meshPoint } from './motion.mjs'
import { rigidSword } from './pose.mjs'
import { KNIGHT_RIG, defineRig, facingFor, validateViews, sampleRigVfx } from './rig.mjs'


// DEV actor-only GPU compositing, NOT a second game loop. Actual texture quality
// and Canvas/GPU copy cost must be measured before promoting this architecture.
export async function createHeroPixi(image, report, { profile = KNIGHT_RIG, job = 'knight', directionalLayers } = {}) {
  profile=defineRig(profile)
  const W=profile.width,H=profile.height,WIDTH=Math.ceil(W*2.5),HEIGHT=Math.ceil(H*1.85),FOOT_X=WIDTH/2,FOOT_Y=HEIGHT-H*.4
  await image.decode()
  const layers=getRigidWeaponLayers(image,job)
  if(!layers) return null
  const app=new Application()
  await app.init({width:WIDTH,height:HEIGHT,resolution:3,backgroundAlpha:0,preference:'webgl',
    autoStart:false,sharedTicker:false,preserveDrawingBuffer:true})
  let disposed=false,failed=false,reported=false,old=null,owner=null,facing=0,active=null
  try {
    const root=new Container()
    root.position.set(FOOT_X,FOOT_Y)
    app.stage.addChild(root)
    function createView(layer, viewProfile) {
      const group=new Container()
      const body=new MeshPlane({texture:Texture.from(layer.body),verticesX:11,verticesY:13})
      body.autoResize=false
      body.position.set(-W/2,-H+4)
      const buffer=body.geometry.getBuffer('aPosition'), vertices=buffer.data
      const rest=new Float32Array(vertices.length)
      for(let i=0;i<vertices.length;i+=2){
        rest[i]=vertices[i]*W/layer.body.width
        rest[i+1]=vertices[i+1]*H/layer.body.height
      }
      const skin=createRigSkin(rest,W,H,layer.grip,viewProfile)
      const restGrip=meshPoint(rest,11,13,...layer.grip)
      const weapon=new Sprite(Texture.from(layer.weapon))
      weapon.anchor.set(...layer.grip)
      group.addChild(body,weapon)
      group.visible=false
      root.addChild(group)
      return {group,buffer,vertices,skin,restGrip,weapon,layer,profile:viewProfile}
    }
    // A second hero supplies its own validated rig profile and same-handed native layers.
    // Directional textures are opt-in and loaded once, never created per frame.
    const views=directionalLayers ? validateViews(directionalLayers.map(v=>v.meta),profile.weaponHand).map(meta=>{
      const v=directionalLayers.find(x=>x.meta.direction===meta.direction)
      return createView(v.layers,defineRig({...profile,...v.profile,id:profile.id,sourceAngle:meta.sourceAngle}))
    }) : null
    const fallback=views?null:createView(layers,profile)
    const canvas=app.canvas
    const onLost=event=>{event.preventDefault();failed=true;report('canvas')}
    canvas.addEventListener('webglcontextlost',onLost)
    return {
      draw(ctx,hero,anim,clock,frozen,reduceFlashing=false){
        if(disposed||failed||document.hidden)return false
        try {
          if(owner!==hero){old=null;owner=hero;facing=0}
          if(!old||(!frozen&&(old.clock!==clock||old.pose!==anim.pose||old.phase!==anim.phase||old.reducedMotion!==anim.reducedMotion||old.reduceFlashing!==reduceFlashing))||old.reducedMotion!==anim.reducedMotion||old.reduceFlashing!==reduceFlashing){
            // Never mirror the source sword. Reuse the existing arm IK in its unmirrored coordinate system.
            const model={...hero,face:1}
            const rig=sampleWeaponRig(job,model,anim)
            const idle=sampleWeaponRig(job,model,{...anim,pose:'idle',phase:0})
            const input={...anim,clock,vx:hero.vx,vy:hero.vy,move:hero.moveAmount,
              step:hero.step,aim:hero.aimAngle,handX:rig.hand.x-idle.hand.x,handY:rig.hand.y-idle.hand.y,
              elbowX:rig.elbow.x-idle.elbow.x,elbowY:rig.elbow.y-idle.elbow.y,
              supportX:rig.supportHand.x-idle.supportHand.x,supportY:rig.supportHand.y-idle.supportHand.y,
              supportElbowX:rig.supportElbow.x-idle.supportElbow.x,supportElbowY:rig.supportElbow.y-idle.supportElbow.y}
            const motion=advanceRigMotion(old,input,profile)
            facing=facingFor(profile,motion,facing)
            const selected=views?views[facing]:fallback
            if(active!==selected){if(active)active.group.visible=false;selected.group.visible=true;active=selected}
            const current=advanceRigMotion(old,input,selected.profile)
            const {vertices,skin,buffer,restGrip,weapon:sword,layer}=selected
            deformRig(skin,vertices,current)
            buffer.update()
            const grip=meshPoint(vertices,11,13,...layer.grip)
            const transform=rigidSword(layer.weapon.width,layer.weapon.height,H,layer.grip,W,grip.x-restGrip.x,grip.y-restGrip.y,current.blade)
            sword.position.set(transform.x,transform.y)
            sword.scale.set(transform.scale)
            sword.rotation=transform.rotation
            // GPU sprite tint is a local feedback effect, no full-screen flashing or extra filter pass.
            const effect=sampleRigVfx(anim,reduceFlashing)
            sword.tint=effect.flash>0?0xffdfa7:0xffffff
            app.render()
            old={...current,reduceFlashing}
          }
          ctx.drawImage(canvas,-FOOT_X,-FOOT_Y,WIDTH,HEIGHT)
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

export const createKnightPixi = (image,report) => createHeroPixi(image,report)
