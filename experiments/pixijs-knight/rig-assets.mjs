import { defineRig, validateViews } from './rig.mjs'
/** Only admitted assets are returned. No partial set may replace the legacy hero. */
export async function loadDirectionalAssets(manifest, profile, loadImage, {allowCandidate=false}={}) {
  if (manifest?.version!==1||manifest.hero!==profile.id||(manifest.status!=='approved'&&!(allowCandidate&&manifest.status==='QA_PENDING'))) throw new Error('Directional rig is not admitted')
  const views=validateViews(manifest.views,profile.weaponHand)
  const paths=views.flatMap(v=>[v.body,v.weapon])
  if(new Set(paths).size!==paths.length) throw new Error('Duplicate directional artwork')
  return Promise.all(views.map(async meta=>{
    if(!meta.profile?.legJoints||!meta.profile?.regions)throw new Error('Missing per-view anatomy')
    const definition=defineRig({...profile,...meta.profile,id:profile.id,sourceAngle:meta.sourceAngle})
    const [body,weapon]=await Promise.all([loadImage(meta.body),loadImage(meta.weapon)])
    if(body.naturalWidth<Math.ceil(profile.width*3)||body.naturalHeight<Math.ceil(profile.height*3)||body.naturalWidth!==weapon.naturalWidth||body.naturalHeight!==weapon.naturalHeight)throw new Error('Directional layers must have matching native 3x geometry')
    return {meta,profile:definition,layers:{body,weapon,grip:meta.grip}}
  }))
}
