import { cpSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// The web manifest and its icons/screenshots stay at the repo root (README links them); ship them as-is.
const copyRootStatics = (): Plugin => ({
  name: 'copy-root-statics',
  apply: 'build',
  closeBundle() {
    cpSync('manifest.webmanifest', 'dist/manifest.webmanifest')
    cpSync('assets', 'dist/assets', { recursive: true })
  },
})

export default defineConfig({
  base: './',
  plugins: [vue(), copyRootStatics()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { assetsInlineLimit: 0 },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
})
