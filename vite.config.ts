import { cpSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Ship root web statics, but keep immutable C104 PNG masters in the repository only.
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
      const sourceAssets = resolve(root, 'assets')
      cpSync(sourceAssets, resolve(outDir, 'assets'), {
        recursive: true,
        filter: source => !/^images[\\/]imgs(?:[1-9]|10)\.png$/i.test(relative(sourceAssets, source)),
      })
    },
  }
}

// Real game renderer in both serve and build; jsdom tests use the existing stub.
const knightPixi = (): Plugin => {
  const virtualId = String.fromCharCode(0) + 'virtual:knight-pixi'
  let test = false
  return {
    name: 'knight-pixi-candidate',
    configResolved(config) { test = config.mode === 'test' },
    resolveId(id) { if (id === 'virtual:knight-pixi') return virtualId },
    load(id) {
      if (id !== virtualId) return
      if (test)
        return 'export async function createKnightPixi() { return null }'
      return 'export { createKnightPixi } from "/experiments/pixijs-knight/live.mjs"'
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), copyRootStatics(), knightPixi()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { assetsInlineLimit: 0 },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
})
