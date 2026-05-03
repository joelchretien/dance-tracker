import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { execSync } from 'child_process'

/**
 * Try `git rev-parse` first, fall back to GITHUB_SHA, then to 'unknown'.
 * The first works locally and in GitHub Actions checkouts; the fallback
 * covers source archives, copied working trees, and CI environments
 * without a .git directory.
 */
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    const sha = process.env.GITHUB_SHA
    if (sha && sha.length >= 7) return sha.slice(0, 7)
    return 'unknown'
  }
}

const gitHash = getGitHash()

/**
 * Stamp dist/sw.js with the build's git hash so the cache name changes on
 * every deploy. Without this, the dev has to manually bump the version
 * string and forgetting it leaves stale caches floating around.
 *
 * Vite copies public/* into dist/* verbatim near the end of the build.
 * We overwrite dist/sw.js after that copy completes (closeBundle runs
 * after writeBundle, after publicDir is copied).
 */
function stampServiceWorker() {
  return {
    name: 'stamp-sw-cache-version',
    apply: 'build' as const,
    closeBundle: {
      sequential: true,
      order: 'post' as const,
      async handler() {
        const { writeFileSync, readFileSync } = await import('fs')
        const distPath = resolve(__dirname, 'dist/sw.js')
        const src = readFileSync(distPath, 'utf8')
        const stamped = src.replace(
          /const CACHE_NAME = '[^']*'/,
          `const CACHE_NAME = 'dance-tracker-${gitHash}'`,
        )
        writeFileSync(distPath, stamped)
      },
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), stampServiceWorker()],
  base: '/dance-tracker/',
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
