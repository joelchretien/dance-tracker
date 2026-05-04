/**
 * Parser for the dance-tracker schedule DSL.
 *
 * The DSL is a hand-friendly compact format that pairs cleanly with the
 * "feed PDF to Claude, get DSL out" conversion workflow. Lines are
 * pipe-separated; the first column is a tag.
 *
 *   D|YYYY-MM-DD|LABEL                                          day header
 *   S|category[|age]                                            section header (sticky age, optional)
 *   E|num|time|title|studio|count[|dancer1;dancer2;...]         dance entry
 *   A|time|title                                                awards entry
 *   B|time|title                                                break entry
 *   #...                                                        comment (ignored)
 *   <blank>                                                     ignored
 *
 * Parser is pure: takes the DSL text and a `meta` object, returns the
 * ScheduleFile shape that downstream consumers (validateSchedule,
 * loadSchedule) already understand.
 *
 * Errors point at the source line number for fast triage when the DSL
 * was hand-edited or AI-generated.
 */

import type { ScheduleFile, ScheduleEntry, ScheduleDay, ScheduleMeta } from '@/types/schedule'

interface SectionContext {
  category: string
  age: number | null
}

function fail(line: number, message: string): never {
  throw new Error(`parse-schedule-dsl line ${line}: ${message}`)
}

export function parseScheduleDSL(text: string, meta: ScheduleMeta): ScheduleFile {
  const days: ScheduleDay[] = []
  let currentDay: ScheduleDay | null = null
  let currentSection: SectionContext | null = null

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1
    const raw = lines[i]
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#')) continue

    const parts = line.split('|')
    const tag = parts[0]

    switch (tag) {
      case 'D': {
        const [, date, label] = parts
        if (!date || !label) fail(lineNo, `D line needs date and label: "${line}"`)
        currentDay = { date, label, entries: [] }
        days.push(currentDay)
        currentSection = null
        break
      }

      case 'S': {
        // Section header. Takes a free-form category string and an
        // optional sticky age that applies to all entries until the
        // next S line. Earlier versions of this DSL used a structured
        // `S|Group|Level|Div|Age|Style` shape that mechanically built
        // the category — this was retired in favor of free-form text
        // because the structured fields offered no semantics beyond
        // string assembly, and "special" sections (battle finals,
        // showcases) didn't fit the structured mold without contortion.
        //
        // Migration path: any `.dat` file generated against the old
        // grammar must be rewritten by `scripts/migrate-dsl.ts`.
        if (parts.length < 2 || !parts[1]) {
          fail(lineNo, `S line needs a category: "${line}"`)
        }
        const ageStr = parts[2]
        let ageNum: number | null = null
        if (ageStr) {
          ageNum = parseInt(ageStr, 10)
          if (Number.isNaN(ageNum)) {
            fail(lineNo, `S line has non-numeric age "${ageStr}": "${line}"`)
          }
        }
        currentSection = {
          category: parts[1],
          age: ageNum,
        }
        break
      }

      case 'E': {
        if (!currentDay) fail(lineNo, `E line before any D (day) header: "${line}"`)
        if (!currentSection) {
          // Defensive: previous version dereferenced currentSection.category
          // and crashed mid-run, leaving JSON half-written. Now we surface
          // the structural error with a useful message.
          fail(lineNo, `E line before any S (section) header: "${line}"`)
        }
        const [, num, time, title, studio, count, dancers] = parts
        if (!num || !time || !title) fail(lineNo, `E line needs num|time|title: "${line}"`)
        const numInt = parseInt(num, 10)
        if (Number.isNaN(numInt)) fail(lineNo, `E line has non-numeric num "${num}": "${line}"`)

        const entry: ScheduleEntry = {
          type: 'dance',
          time,
          title,
          num: numInt,
        }
        // Key ordering matches the original schedule data (studio, category,
        // then dancers/age) so regenerating from the DSL is byte-idempotent
        // with the production JSON.
        if (studio) (entry as { studio?: string }).studio = studio
        ;(entry as { category: string }).category = currentSection.category
        if (dancers) {
          const list = dancers.split(';').map(s => s.trim()).filter(Boolean)
          if (list.length > 0) entry.dancers = list
        }
        if (currentSection.age != null) entry.age = currentSection.age
        // count is intentionally not used (validator/UI don't need it); kept
        // in the DSL because it's useful for the human writing it.
        void count
        currentDay.entries.push(entry)
        break
      }

      case 'A': {
        if (!currentDay) fail(lineNo, `A line before any D (day) header: "${line}"`)
        const [, time, title] = parts
        if (!time || !title) fail(lineNo, `A line needs time|title: "${line}"`)
        currentDay.entries.push({ type: 'awards', time, title })
        break
      }

      case 'B': {
        if (!currentDay) fail(lineNo, `B line before any D (day) header: "${line}"`)
        const [, time, title] = parts
        if (!time || !title) fail(lineNo, `B line needs time|title: "${line}"`)
        currentDay.entries.push({ type: 'break', time, title })
        break
      }

      default:
        fail(lineNo, `unknown line tag "${tag}": "${line}"`)
    }
  }

  if (days.length === 0) fail(0, 'no D (day) headers found')

  return { meta, days }
}
