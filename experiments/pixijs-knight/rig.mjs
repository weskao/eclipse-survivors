const TAU = 2 * Math.PI
const finite = Number.isFinite
const unit = n => finite(n) && n >= 0 && n <= 1
const pair = p => Array.isArray(p) && p.length === 2 && p.every(unit)
const clamp = n => Math.max(0, Math.min(1, n))
const octant = angle => ((Math.round(angle * 8 / TAU) % 8) + 8) % 8
const chain = a => Array.isArray(a) && a.length === 3 && a.every(pair) && a.slice(1).every((p,i)=>Math.hypot(p[0]-a[i][0],p[1]-a[i][1])>1e-5)
const foot = f => f && pair(f.heel) && pair(f.toe) && Math.hypot(f.heel[0]-f.toe[0],f.heel[1]-f.toe[1])>1e-5
const region = a => Array.isArray(a) && a.length === 4 && unit(a[0]) && unit(a[1]) && a.slice(2).every(n => finite(n) && n > 0)
const immutable = value => { if (value && typeof value === 'object') { for (const child of Object.values(value)) immutable(child); Object.freeze(value) } return value }
/** Visual-only data. Each profile owns its source anatomy; never silently mirror asymmetric gear. */
export function defineRig(profile) {
  if (!profile || typeof profile.id !== 'string' || !profile.id || !finite(profile.width) || profile.width <= 0 || !finite(profile.height) || profile.height <= 0 || !finite(profile.sourceAngle) || !chain(profile.legJoints?.left) || !chain(profile.legJoints?.right) || (profile.armJoints && (!chain(profile.armJoints.weapon) || !chain(profile.armJoints.support))) || (profile.footJoints && (!foot(profile.footJoints.left) || !foot(profile.footJoints.right))) || (profile.viewAngle!==undefined && !finite(profile.viewAngle)) || !Array.isArray(profile.regions) || profile.regions.length !== 10 || !profile.regions.every(region)) throw new RangeError('Invalid humanoid rig profile')
  return immutable(structuredClone(profile))
}
export const KNIGHT_RIG = defineRig({id:'knight',width:108,height:134,sourceAngle:2.3,weaponHand:'right',
  legJoints:{left:[[.46,.63],[.41,.77],[.32,.86]],right:[[.57,.64],[.68,.80],[.74,.96]]},
  regions:[[.27,.41,.20,.23],[.75,.56,.23,.25],[.72,.41,.19,.24],[.52,.45,.32,.31],[.54,.11,.20,.23],[.41,.77,.20,.22],[.32,.86,.19,.20],[.68,.80,.20,.22],[.74,.96,.19,.20],[.90,.55,.25,.35]]})
export function facingFor(_profile, motion, previous = 0) {
  if (motion.pose === 'attack' || motion.pose === 'cast') return octant(motion.aim)
  return motion.slot === 8 ? previous : octant(motion.heading)
}
/** All eight independently authored, same-handed views; no inferred mirror. */
export function validateViews(views, weaponHand) {
  if (!['left','right'].includes(weaponHand) || !Array.isArray(views) || views.length !== 8 || new Set(views.map(v=>v.direction)).size !== 8 || views.some(v=>!Number.isInteger(v.direction)||v.direction<0||v.direction>7||!pair(v.grip)||(v.footAnchor!==undefined&&!pair(v.footAnchor))||(v.weaponDepth!==undefined&&!['front','behind'].includes(v.weaponDepth))||!finite(v.sourceAngle)||v.weaponHand!==weaponHand||typeof v.body!=='string'||!v.body||typeof v.weapon!=='string'||!v.weapon||v.body===v.weapon)) throw new RangeError('Invalid directional layers')
  return immutable(structuredClone(views).sort((a,b)=>a.direction-b.direction))
}
/** Visual clock only: no particle allocations or changes to combat. */
export function sampleRigVfx(anim, reduceFlashing) {
  if (anim.reducedMotion) return {slash:0,flash:0,dash:0,special:0}
  const phase=clamp(anim.phase), action=anim.pose==='attack'||anim.pose==='cast'
  return {slash:action&&!anim.special?Math.max(0,1-phase*2.5):0,flash:action&&!reduceFlashing?Math.max(0,1-phase*5)*.35:0,dash:anim.pose==='dash'?1-phase:0,special:anim.special?Math.sin(phase*Math.PI):0}
}
