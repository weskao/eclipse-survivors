import { cpSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// The web manifest and its icons/screenshots stay at the repo root (README links them); ship them as-is.
const copyRootStatics = (): Plugin => {
  let root = ''
  let outDir = ''
  return {
    name: 'copy-root-statics',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    // writeBundle (not closeBundle) only runs after a successful write.
    writeBundle() {
      cpSync(resolve(root, 'manifest.webmanifest'), resolve(outDir, 'manifest.webmanifest'))
      cpSync(resolve(root, 'assets'), resolve(outDir, 'assets'), { recursive: true })
    },
  }
}

// `make dev embers=N`: rewrite the real v3 save's wallet before the app boots. Dev server only,
// so no build ever contains it. Unlocked playtests use a memory save (see dev-unlocked.ts) instead.
const devEmbers = (): Plugin => {
  const raw = process.env.VITE_ES2_EMBERS
  return {
    name: 'dev-embers',
    apply: (_, { command }) => command === 'serve' && raw !== undefined,
    configResolved() {
      if (!/^\d+$/.test(raw!) || !Number.isSafeInteger(Number(raw)))
        throw new Error(`embers=${raw} must be a non-negative integer up to ${Number.MAX_SAFE_INTEGER}`)
    },
    transformIndexHtml: () => process.env.VITE_ES2_UNLOCKED === '1' ? [] : [{
      tag: 'script', attrs: { type: 'module' }, injectTo: 'head', children: `
import { createMetaProgressionStore, META_V3_HEAD_KEY, META_V3_SLOT_KEYS } from '/src/game/content/meta/store.ts'
const embers = ${Number(raw)}
const current = createMetaProgressionStore().get()
if (current.status !== 'ready' || !current.state) console.warn('[dev] save is blocked; Twilight Embers unchanged')
else if (current.state.embers !== embers) {
  // Same two-slot commit as store.ts: write the inactive slot, then flip the head.
  const slot = JSON.parse(localStorage.getItem(META_V3_HEAD_KEY) ?? 'null')?.slot === 'a' ? 'b' : 'a'
  const revision = current.revision + 1
  localStorage.setItem(META_V3_SLOT_KEYS[slot], JSON.stringify({
    schema: 'eclipse-survivors.meta.v3', revision, state: { ...current.state, embers },
    legacyProfile: current.legacyProfile,
  }))
  localStorage.setItem(META_V3_HEAD_KEY, JSON.stringify({ version: 3, slot, revision }))
  console.info('[dev] Twilight Embers set to', embers)
}`,
    }],
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), copyRootStatics(), devEmbers()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { assetsInlineLimit: 0 },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
})
