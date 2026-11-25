export type CloudRuntime = { mode: 'unavailable' | 'emulator' | 'live' | 'auth-only'; config?: string; projectId?: string }
export function resolveCloudRuntime(options: { dev: boolean; emulator: boolean; unlocked: boolean; hostname: string; config?: string }): CloudRuntime {
  if (options.dev && options.emulator) {
    if (options.hostname !== '127.0.0.1' && options.hostname !== 'localhost') return { mode: 'unavailable' }
    const projectId = options.unlocked ? 'demo-eclipse-survivors-unlocked' : 'demo-eclipse-survivors'
    return { mode: 'emulator', config: JSON.stringify({ apiKey: 'demo-api-key', authDomain: projectId + '.firebaseapp.com', projectId, appId: '1:123:web:cloudqa' }), projectId }
  }
  if (!options.config) return { mode: 'unavailable' }
  return { mode: options.dev && options.unlocked ? 'auth-only' : 'live', config: options.config }
}
export function cloudRuntime(): CloudRuntime {
  return resolveCloudRuntime({
    dev: import.meta.env.DEV,
    emulator: import.meta.env.VITE_ES2_FIREBASE_EMULATOR === '1',
    unlocked: import.meta.env.VITE_ES2_UNLOCKED === '1',
    hostname: typeof location === 'undefined' ? '' : location.hostname,
    config: import.meta.env.VITE_ES2_FIREBASE_CONFIG as string | undefined,
  })
}
