import { cpSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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

// Keep the candidate package isolated until the measured release gate passes.
// The stub preserves frozen-lockfile installs and production builds without PixiJS.
const knightPixi = (): Plugin => ({
  name: 'knight-pixi-candidate',
  resolveId(id) { if (id === 'virtual:knight-pixi') return '\\0' + id },
  load(id) {
    if (id !== '\\0virtual:knight-pixi') return
    const root = new URL('./experiments/pixijs-knight/', import.meta.url)
    if (!existsSync(new URL('node_modules/pixi.js/package.json', root)))
      return 'export async function createKnightPixi() { return null }'
    return 'export { createKnightPixi } from ' + JSON.stringify(fileURLToPath(new URL('live.mjs', root)).replaceAll('\\\\', '/'))
  },
})

export default defineConfig({
  base: './',
  plugins: [vue(), copyRootStatics(), knightPixi()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { assetsInlineLimit: 0 },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
})
