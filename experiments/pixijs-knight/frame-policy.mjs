/** Reuse the preserved actor framebuffer when visible pose is unchanged. */
export function needsRigRender(previous,next,frozen){
  if(!previous||previous.reducedMotion!==next.reducedMotion)return true
  if(next.reducedMotion)return !frozen&&previous.view!==next.view
  if(previous.reduceFlashing!==next.reduceFlashing)return true
  if(frozen)return false
  return previous.clock!==next.clock||previous.pose!==next.pose||previous.phase!==next.phase||previous.view!==next.view||previous.aim!==next.aim||previous.special!==next.special
}
