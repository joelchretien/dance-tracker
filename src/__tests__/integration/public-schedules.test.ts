/**
 * Integration test: every JSON file under public/schedules/ must round-trip
 * through the validator without throwing. This is the test that should have
 * caught the meta.title vs meta.name bug — the unit tests in
 * validate-schedule.test.ts passed because their fixture matched the
 * (wrong) validator. Loading the actual published data is the only way to
 * catch that class of "validator and tests agree with each other while
 * disagreeing with reality" bug.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { validateSchedule } from '@/lib/validate-schedule'

const here = path.dirname(fileURLToPath(import.meta.url))
const SCHEDULES_DIR = path.join(here, '../../../public/schedules')

const scheduleFiles: string[] = fs
  .readdirSync(SCHEDULES_DIR)
  .filter((name: string) => name.endsWith('.json') && name !== 'index.json')

describe('public schedules pass validation', () => {
  if (scheduleFiles.length === 0) {
    it.skip('no schedule files found', () => {})
    return
  }

  for (const file of scheduleFiles) {
    it(`${file} validates`, () => {
      const data = JSON.parse(fs.readFileSync(path.join(SCHEDULES_DIR, file), 'utf8'))
      expect(() => validateSchedule(data)).not.toThrow()
    })
  }
})

describe('manifest matches available schedule files', () => {
  it('every manifest entry has a matching JSON file', () => {
    const manifestPath = path.join(SCHEDULES_DIR, 'index.json')
    if (!fs.existsSync(manifestPath)) return

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const present = new Set(scheduleFiles.map((f: string) => f.replace(/\.json$/, '')))
    for (const entry of manifest.schedules ?? []) {
      expect(present.has(entry.id), `manifest references "${entry.id}" but no ${entry.id}.json`).toBe(true)
    }
  })
})
