#!/usr/bin/env tsx
/**
 * One-shot migration: rewrite old `S|Group|Level|Div|Age|Style` lines
 * into the new free-form grammar `S|literal[|age]`.
 *
 * Usage:
 *   tsx scripts/migrate-dsl.ts <path-to.dat>
 *
 * Reads stdin if no path given. Writes to stdout. Idempotent: lines
 * already in the new shape (≤2 pipes after the S tag) pass through
 * unchanged.
 *
 * Why this exists: the parser's S-tag grammar was simplified — the
 * structured format encoded no semantics beyond `${level} · Division
 * ${div} · ${style} · ${group}`, and the assembled string is now
 * carried directly. Age remains a sticky section field.
 *
 * Safe to delete after every committed `.dat` source has been migrated.
 * One-time tool, not part of the production pipeline.
 */
import { readFileSync, writeFileSync } from 'fs'

function migrateLine(line: string): string {
  // Old `S*|literal` shorthand (introduced earlier in the same simplification
  // arc) is just S now — same free-form semantics.
  if (line.startsWith('S*|')) return 'S' + line.slice(2)

  if (!line.startsWith('S|')) return line
  const parts = line.split('|')
  if (parts.length === 6) {
    // Old structured form: S|Group|Level|Div|Age|Style
    const [, group, level, div, age, style] = parts
    const category = `${level} · Division ${div} · ${style} · ${group}`
    return age ? `S|${category}|${age}` : `S|${category}`
  }
  // Already migrated, or some other shape we should leave alone.
  return line
}

function main() {
  const arg = process.argv[2]
  const input = arg ? readFileSync(arg, 'utf8') : readFileSync(0, 'utf8')
  const out = input.split('\n').map(migrateLine).join('\n')
  if (arg) {
    writeFileSync(arg, out)
    console.error(`✓ migrated ${arg}`)
  } else {
    process.stdout.write(out)
  }
}

main()
