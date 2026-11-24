// Uploaded 4-column x 7-row reference; NOT native-3x or release-approved.
const CELL = 237
const POSES = {
  idle: [0, 0, 4], move: [1, 0, 4], windup: [2, 0, 2], attack: [2, 2, 2],
  recover: [3, 0, 4], hurt: [4, 0, 4], transform: [5, 0, 4], death: [6, 0, 4],
} as const

export function sampleBossSheetFrame(pose: string, progress: number): readonly [number, number, number, number] | null {
  if (!Object.hasOwn(POSES, pose) || !Number.isFinite(progress)) return null
  const [row, start, count] = POSES[pose as keyof typeof POSES]
  const column = start + Math.min(count - 1, Math.floor(Math.max(0, Math.min(1, progress)) * count))
  return [column * CELL, row * CELL, CELL, CELL]
}
