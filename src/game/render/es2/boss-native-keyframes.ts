import type { BossSnapshot } from '../../content/bosses/controller'
import type { Ctx2D } from '../ctx'

// Provisional alpha128 bottom-center anchors from the three committed manifests.
// These are isolated candidate poses, not an approved sequence or phase assignment.
export const BOSS_NATIVE_KEYFRAMES = {
  idle: ['batch-01/infernal-titan/sources/idle-stance-a.webp', 1312, 1199, 624.5, 1185],
  windup: ['batch-01/infernal-titan/sources/windup-key-a.webp', 1262, 1246, 675, 1218],
  move: ['batch-02/infernal-titan/move/stride-key-a.webp', 1312, 1199, 656, 1175],
  slam: ['batch-02/infernal-titan/attack/ground-slam-key-a.webp', 1437, 1095, 724.5, 1087],
  hurt: ['batch-02/infernal-titan/hurt/recoil-key-b.webp', 1312, 1199, 657.5, 1178],
  transform: ['batch-02/infernal-titan/transform/overload-key-a.webp', 1312, 1199, 656, 1195],
  death: ['batch-03/infernal-titan/death/collapse-key-a.webp', 1312, 1199, 659, 1112],
} as const
export type NativeBossKeyframe = keyof typeof BOSS_NATIVE_KEYFRAMES
const registered = new WeakMap<HTMLImageElement, NativeBossKeyframe>()

export function registerBossNativeKeyframe(image: HTMLImageElement, key: NativeBossKeyframe): void {
  registered.set(image, key)
}
export function isBossNativeKeyframe(image: HTMLImageElement): boolean {
  return registered.has(image)
}

export function selectBossNativeKeyframe(snapshot: BossSnapshot): NativeBossKeyframe | null {
  const motion = snapshot.bodyMotion
  if (snapshot.id !== 'infernal-titan' || !snapshot.phase || !motion || motion.phase !== snapshot.phase
      || !Number.isFinite(motion.progress) || motion.progress < 0 || motion.progress > 1) return null
  switch (motion.pose) {
    case 'windup': return snapshot.telegraphs.some(t => t.stage === 'warning' && t.attackId === 'titan-slam') ? 'windup' : null
    case 'attack': return snapshot.impacts?.at(-1)?.attackId === 'titan-slam' ? 'slam' : null
    case 'recover': return null
    default: return motion.pose
  }
}

export function drawBossNativeKeyframe(ctx: Ctx2D, image: HTMLImageElement, snapshot: BossSnapshot,
  scaledDisplaySize: number, reducedMotion = false): boolean {
  const key = registered.get(image)
  if (reducedMotion || !key || key !== selectBossNativeKeyframe(snapshot) || !image.complete
      || !Number.isFinite(scaledDisplaySize) || scaledDisplaySize <= 0) return false
  const [, width, height, anchorX, anchorY] = BOSS_NATIVE_KEYFRAMES[key]
  if (image.naturalWidth !== width || image.naturalHeight !== height) return false
  // Common source scale: do not resize each pose to its changing bounding box.
  const scale = scaledDisplaySize / 1200
  ctx.drawImage(image, 0, 0, width, height, -anchorX * scale, 4 - anchorY * scale, width * scale, height * scale)
  return true
}
