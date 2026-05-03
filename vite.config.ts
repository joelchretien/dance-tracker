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
 * Implementation note: reads from public/sw.js and writes to dist/sw.js
 * directly, rather than rewriting whatever Vite already copied into dist.
 * This sidesteps a timing question between Vite's internal public-copy
 * step and Rollup's closeBundle hooks — at least in vite@6.4 the public
 * copy ran AFTER closeBundle on clean builds, which made the previous
 * "read from dist/sw.js" path fail with ENOENT on the first build of
 * a session. Reading from source is also more obviously correct: the
 * cache name we want comes from public/sw.js's literal, not from
 * whatever happened to be in dist from a prior build.
 *
 * Fails the build if the CACHE_NAME pattern can't be found in the source —
 * without this guard, a future refactor of public/sw.js (single-quote →
 * double-quote, different declaration shape, etc.) would silently leave
 * the cache name unstamped and ship stale caches to production.
 */
function stampServiceWorker() {
  return {
    name: 'stamp-sw-cache-version',
    apply: 'build' as const,
    writeBundle: {
      sequential: true,
      order: 'post' as const,
      async handler() {
        const { writeFileSync, readFileSync, mkdirSync } = await import('fs')
        const sourcePath = resolve(__dirname, 'public/sw.js')
        const distPath = resolve(__dirname, 'dist/sw.js')
        const src = readFileSync(sourcePath, 'utf8')
        const pattern = /const CACHE_NAME = '[^']*'/
        if (!pattern.test(src)) {
          throw new Error(
            'stamp-sw-cache-version: failed to find `const CACHE_NAME = \'...\'` in public/sw.js. ' +
            'The replacement pattern in vite.config.ts no longer matches public/sw.js source.',
          )
        }
        const stamped = src.replace(
          pattern,
          `const CACHE_NAME = 'dance-tracker-${gitHash}'`,
        )
        // Ensure dist/ exists. On a clean first build Vite has already
        // created it by the time writeBundle fires, but defensively
        // making it idempotent costs nothing.
        mkdirSync(resolve(__dirname, 'dist'), { recursive: true })
        writeFileSync(distPath, stamped)
      },
    },
  }
}

/**
 * Assert that PWA asset links in the built index.html resolve to the
 * configured base path, not to the domain root. On a non-root deploy
 * (project page at /dance-tracker/), root-relative paths like
 * /manifest.webmanifest would 404.
 *
 * The source uses `./` relative paths and Vite leaves those alone; this
 * check is a smoke alarm in case someone reverts to absolute paths or
 * a future Vite version changes how it processes them.
 */
function assertPwaAssetPaths(base: string) {
  return {
    name: 'assert-pwa-asset-paths',
    apply: 'build' as const,
    writeBundle: {
      sequential: true,
      order: 'post' as const,
      async handler() {
        if (base === '/') return
        const { readFileSync } = await import('fs')
        const html = readFileSync(resolve(__dirname, 'dist/index.html'), 'utf8')
        const offenders: string[] = []
        // Match href on icon / apple-touch-icon / manifest links and check
        // that each href resolves under the configured base or is relative.
        const linkPattern = /<link[^>]+rel=["'](?:icon|apple-touch-icon|manifest)["'][^>]+href=["']([^"']+)["']/g
        let m: RegExpExecArray | null
        while ((m = linkPattern.exec(html))) {
          const href = m[1]
          if (href.startsWith('/') && !href.startsWith(base)) {
            offenders.push(href)
          }
        }
        if (offenders.length > 0) {
          throw new Error(
            `assert-pwa-asset-paths: dist/index.html contains root-relative PWA links that don't honor base="${base}": ${offenders.join(', ')}`,
          )
        }
      },
    },
  }
}

const PROJECT_BASE = '/dance-tracker/'

export default defineConfig({
  plugins: [vue(), tailwindcss(), stampServiceWorker(), assertPwaAssetPaths(PROJECT_BASE)],
  base: PROJECT_BASE,
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
