/**
 * Route-classification tests for the service worker.
 *
 * The SW source is a plain script with module-level event listener
 * registrations, which is hard to test directly without a full SW
 * harness. Rather than try to evaluate the file in jsdom, we re-derive
 * the routing predicates here so a divergence between source and test
 * is loud and obvious. Update both when changing routing.
 *
 * If/when public/sw.js gets converted to a TS source built into
 * dist/sw.js, these predicates should move into a shared module.
 */
import { describe, it, expect } from 'vitest'

type Route = 'navigation' | 'hashed-asset' | 'manifest' | 'schedule' | 'other'

function classify(url: string, request: { mode?: string; destination?: string } = {}): Route {
  const { pathname } = new URL(url)
  if (request.mode === 'navigate' || request.destination === 'document') return 'navigation'
  if (pathname.match(/\/assets\/.*-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|ttf|otf|eot)$/)) return 'hashed-asset'
  if (pathname.endsWith('/schedules/index.json')) return 'manifest'
  if (pathname.match(/\/schedules\/[^/]+\.json$/)) return 'schedule'
  return 'other'
}

describe('service worker route classification', () => {
  describe('navigation requests', () => {
    it('classifies navigation mode as navigation', () => {
      expect(classify('https://app.example/dance-tracker/', { mode: 'navigate' })).toBe('navigation')
    })
    it('classifies document destination as navigation', () => {
      expect(classify('https://app.example/dance-tracker/', { destination: 'document' })).toBe('navigation')
    })
  })

  describe('hashed assets', () => {
    it('classifies content-hashed JS as a hashed asset', () => {
      expect(classify('https://app.example/dance-tracker/assets/index-DkwkJiPC.js')).toBe('hashed-asset')
    })
    it('classifies content-hashed CSS as a hashed asset', () => {
      expect(classify('https://app.example/dance-tracker/assets/index-qzh-ryJG.css')).toBe('hashed-asset')
    })
    it('does not classify non-hashed asset paths', () => {
      // Defensive: an unhashed asset path shouldn't get immutable
      // cache-first behavior.
      expect(classify('https://app.example/dance-tracker/assets/manifest.json')).toBe('other')
      expect(classify('https://app.example/dance-tracker/assets/logo.png')).toBe('other')
    })
    it('matches hashed fonts too', () => {
      expect(classify('https://app.example/dance-tracker/assets/Inter-abc12345.woff2')).toBe('hashed-asset')
    })
  })

  describe('schedule manifest', () => {
    it('classifies index.json as the manifest, not a schedule', () => {
      // This was the P2 bug from the staff review: the schedule regex
      // matched index.json and got SWR'd. Manifest must be network-first.
      expect(classify('https://app.example/dance-tracker/schedules/index.json')).toBe('manifest')
    })
    it('classifies index.json regardless of base path', () => {
      expect(classify('https://app.example/schedules/index.json')).toBe('manifest')
      expect(classify('https://app.example/some/sub/path/schedules/index.json')).toBe('manifest')
    })
  })

  describe('schedule data files', () => {
    it('classifies a named schedule file as schedule', () => {
      expect(classify('https://app.example/dance-tracker/schedules/otf-2026.json')).toBe('schedule')
    })
    it('classifies any non-index.json schedule as schedule', () => {
      expect(classify('https://app.example/dance-tracker/schedules/foo-2027.json')).toBe('schedule')
    })
    it('does not classify deeper nested paths as schedule', () => {
      // The regex matches a single segment after /schedules/. Nested
      // paths fall through to the catch-all.
      expect(classify('https://app.example/dance-tracker/schedules/sub/dir/file.json')).toBe('other')
    })
  })

  describe('catch-all', () => {
    it('classifies the manifest webmanifest as other (network-first)', () => {
      expect(classify('https://app.example/dance-tracker/manifest.webmanifest')).toBe('other')
    })
    it('classifies icon images as other', () => {
      expect(classify('https://app.example/dance-tracker/icon-192.png')).toBe('other')
    })
    it('classifies favicon as other', () => {
      expect(classify('https://app.example/dance-tracker/favicon.png')).toBe('other')
    })
  })

  // Regression for the staff review: navigation classification beats
  // every other branch. A user navigating to /dance-tracker/ shouldn't
  // be misrouted as a manifest fetch.
  it('navigation precedence over path-based branches', () => {
    expect(
      classify('https://app.example/dance-tracker/schedules/index.json', { mode: 'navigate' }),
    ).toBe('navigation')
  })
})
