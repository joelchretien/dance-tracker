#!/usr/bin/env tsx
/**
 * Build a schedule JSON from a .dat DSL file and the manifest entry's metadata.
 *
 * Usage:
 *   npm run build:schedule -- <id>
 *   tsx scripts/build-schedule.ts <id>
 * e.g. tsx scripts/build-schedule.ts otf-2026
 *
 * Reads:
 *   scripts/schedules-source/<id>.dat       — DSL source
 *   public/schedules/index.json             — manifest (looks up name)
 * Writes:
 *   public/schedules/<id>.json              — parsed schedule
 *
 * If <id> isn't in the manifest, fails with a clear error. The author
 * should add { id, name } to public/schedules/index.json by hand before
 * building — keeps the CLI from inventing display names from file names.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseScheduleDSL } from '../src/lib/parse-schedule-dsl'
import { validateSchedule } from '../src/lib/validate-schedule'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const id = process.argv[2]
if (!id) {
  console.error('Usage: tsx scripts/build-schedule.ts <id>')
  console.error('  e.g. tsx scripts/build-schedule.ts otf-2026')
  process.exit(1)
}

if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
  console.error(`Invalid id "${id}": must match /^[a-zA-Z0-9_-]+$/ (same grammar the route accepts)`)
  process.exit(1)
}

const datPath = resolve(repoRoot, `scripts/schedules-source/${id}.dat`)
if (!existsSync(datPath)) {
  console.error(`Source not found: ${datPath}`)
  process.exit(1)
}

const manifestPath = resolve(repoRoot, 'public/schedules/index.json')
interface ManifestFile { schedules: { id: string; name: string }[] }
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ManifestFile
const manifestEntry = manifest.schedules.find(s => s.id === id)
if (!manifestEntry) {
  console.error(`Manifest has no entry for id "${id}".`)
  console.error(`Add { "id": "${id}", "name": "..." } to public/schedules/index.json first.`)
  process.exit(1)
}

const dsl = readFileSync(datPath, 'utf8')

let schedule
try {
  schedule = parseScheduleDSL(dsl, { id: manifestEntry.id, name: manifestEntry.name })
} catch (err) {
  console.error(`Parse error: ${(err as Error).message}`)
  process.exit(1)
}

// Run the schema validator before writing, so a bad DSL never produces
// a bad JSON. The validator catches things the parser wouldn't (e.g.
// non-chronological times within a day).
try {
  validateSchedule(schedule)
} catch (err) {
  console.error(`Validation error: ${(err as Error).message}`)
  process.exit(1)
}

const outPath = resolve(repoRoot, `public/schedules/${id}.json`)
writeFileSync(outPath, JSON.stringify(schedule, null, 2))

const total = schedule.days.reduce((s, d) => s + d.entries.length, 0)
console.log(`✓ Built ${id}.json (${total} entries across ${schedule.days.length} days)`)
for (const d of schedule.days) {
  console.log(`  ${d.date} ${d.label}: ${d.entries.length} entries`)
}
