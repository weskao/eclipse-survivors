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

export default defineConfig({
  base: './',
  plugins: [vue(), copyRootStatics()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { assetsInlineLimit: 0 },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
})
