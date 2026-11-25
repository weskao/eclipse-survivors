import { Application, Container, MeshPlane, Sprite, Texture } from 'pixi.js'
import { getRigidWeaponLayers } from '../../src/game/render/rigid-weapons.ts'
import { sampleWeaponRig } from '../../src/game/render/weapon-rig.ts'
import { advanceKnightMotion, createKnightSkin, deformKnight, meshPoint } from './motion.mjs'
import { rigidSword } from './pose.mjs'

const W=108,H=134, WIDTH=256,HEIGHT=240,FOOT_X=128,FOOT_Y=182
// DEV actor-only GPU compositing, NOT a second game loop. Actual texture quality
// and Canvas/GPU copy cost must be measured before promoting this architecture.
export async function createKnightPixi(image, report) {
  await image.decode()
  const layers=getRigidWeaponLayers(image,'knight')
  if(!layers) return null
  const app=new Application()
  await app.init({width:WIDTH,height:HEIGHT,resolution:3,backgroundAlpha:0,preference:'webgl',
    autoStart:false,sharedTicker:false,preserveDrawingBuffer:true})
  let disposed=false,failed=false,reported=false,old=null,owner=null
  try {
    const root=new Container()
    root.position.set(FOOT_X,FOOT_Y)
    app.stage.addChild(root)
    const body=new MeshPlane({texture:Texture.from(layers.body),verticesX:11,verticesY:13})
    body.autoResize=false
    body.position.set(-W/2,-H+4)
    const buffer=body.geometry.getBuffer('aPosition'), vertices=buffer.data
    const rest=new Float32Array(vertices.length)
    for(let i=0;i<vertices.length;i+=2){
      rest[i]=vertices[i]*W/layers.body.width
      rest[i+1]=vertices[i+1]*H/layers.body.height
    }
    const skin=createKnightSkin(rest,W,H,layers.grip)
    const restGrip=meshPoint(rest,11,13,...layers.grip)
    const sword=new Sprite(Texture.from(layers.weapon))
    sword.anchor.set(...layers.grip)
    root.addChild(body,sword)
    const canvas=app.canvas
    const onLost=event=>{event.preventDefault();failed=true;report('canvas')}
    canvas.addEventListener('webglcontextlost',onLost)
    return {
      draw(ctx,hero,anim,clock,frozen){
        if(disposed||failed||document.hidden)return false
        try {
          if(owner!==hero){old=null;owner=hero}
          if(!old||(!frozen&&(old.clock!==clock||old.pose!==anim.pose||old.phase!==anim.phase||old.reducedMotion!==anim.reducedMotion))||old.reducedMotion!==anim.reducedMotion){
            // Never mirror the source sword. Reuse the existing arm IK in its unmirrored coordinate system.
            const model={...hero,face:1}
            const rig=sampleWeaponRig('knight',model,anim)
            const idle=sampleWeaponRig('knight',model,{...anim,pose:'idle',phase:0})
            const current=advanceKnightMotion(old,{...anim,clock,vx:hero.vx,vy:hero.vy,move:hero.moveAmount,
              step:hero.step,aim:hero.aimAngle,handX:rig.hand.x-idle.hand.x,handY:rig.hand.y-idle.hand.y,
              elbowX:rig.elbow.x-idle.elbow.x,elbowY:rig.elbow.y-idle.elbow.y,
              supportX:rig.supportHand.x-idle.supportHand.x,supportY:rig.supportHand.y-idle.supportHand.y,
              supportElbowX:rig.supportElbow.x-idle.supportElbow.x,supportElbowY:rig.supportElbow.y-idle.supportElbow.y})
            deformKnight(skin,vertices,current)
            buffer.update()
            const grip=meshPoint(vertices,11,13,...layers.grip)
            const transform=rigidSword(layers.weapon.width,layers.weapon.height,H,layers.grip,W,grip.x-restGrip.x,grip.y-restGrip.y,current.blade)
            sword.position.set(transform.x,transform.y)
            sword.scale.set(transform.scale)
            sword.rotation=transform.rotation
            // GPU sprite tint is a local feedback effect, no full-screen flashing or extra filter pass.
            sword.tint=!anim.reducedMotion&&anim.pose==='attack'&&anim.phase<.22?0xffdfa7:0xffffff
            app.render()
            old=current
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
