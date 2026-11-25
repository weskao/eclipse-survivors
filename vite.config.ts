import { cpSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Ship root web statics, but keep raw art boards and review-only candidates in Git/DEV.
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
        filter: source => {
          const path = relative(sourceAssets, source).replaceAll('\\', '/')
          return !/^images\/imgs(?:[1-9]|10)\.(?:png|webp)$/i.test(path)
            && !/(?:^|\/)candidates(?:\/|$)/i.test(path)
        },
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [vue(), copyRootStatics()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { assetsInlineLimit: 0 },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'], include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
})
