/**
 * One-time conversion script: extracts SATURDAY/SUNDAY arrays from Destiny.html
 * and emits the new JSON format for the Vue rebuild.
 *
 * Usage: node scripts/convert-schedule.js
 */

import { readFileSync, writeFileSync } from 'fs'

const html = readFileSync('Destiny.html', 'utf-8')

// Extract the SATURDAY and SUNDAY arrays using regex to find their boundaries
function extractArray(name) {
  const startRe = new RegExp(`var ${name}\\s*=\\s*\\[`)
  const match = startRe.exec(html)
  if (!match) throw new Error(`Could not find var ${name}`)

  let depth = 0
  let start = match.index + match[0].length - 1 // at the opening [
  let i = start
  for (; i < html.length; i++) {
    if (html[i] === '[') depth++
    else if (html[i] === ']') {
      depth--
      if (depth === 0) break
    }
  }
  const arrayStr = html.slice(start, i + 1)

  // Convert JS object notation to valid JSON:
  // - Add quotes around unquoted keys
  // - Handle trailing commas
  let json = arrayStr
    // Quote unquoted property keys
    .replace(/(\{|,)\s*(\w+)\s*:/g, '$1 "$2":')
    // Remove trailing commas before ] or }
    .replace(/,\s*([}\]])/g, '$1')

  return JSON.parse(json)
}

const saturday = extractArray('SATURDAY')
const sunday = extractArray('SUNDAY')

function classifyType(entry) {
  if (entry.isBreak && entry.title && entry.title.indexOf('AWARDS') >= 0) return 'awards'
  if (entry.isBreak) return 'break'
  return 'dance'
}

function formatCategory(cat) {
  if (!cat) return undefined
  // Pipe-delimited → " · " separated
  // Handle the student choreography format too: "Student Choreography/Solar/Open/Solo|12"
  if (cat.includes('/') && !cat.includes('|') || (cat.includes('/') && cat.includes('|') && !cat.includes('| '))) {
    // Student choreography format
    const parts = cat.split(/[/|]/).filter(Boolean)
    return parts.map(p => p.trim()).join(' · ')
  }
  return cat.split('|').map(s => s.trim()).join(' · ')
}

function convertEntries(entries) {
  return entries.map(e => {
    const type = classifyType(e)
    if (type === 'awards') {
      return { type: 'awards', time: e.time, title: e.title }
    }
    if (type === 'break') {
      return { type: 'break', time: e.time, title: e.title }
    }
    const result = {
      type: 'dance',
      time: e.time,
      title: e.title,
    }
    if (e.num) result.num = e.num
    if (e.studio) result.studio = e.studio
    if (e.category) result.category = formatCategory(e.category)
    if (e.dancers && e.dancers.length > 0) result.dancers = e.dancers
    if (e.age) result.age = e.age
    return result
  })
}

const schedule = {
  meta: {
    id: 'destiny-rising-2025',
    name: 'Destiny Rising 2025',
  },
  days: [
    {
      date: '2025-04-11',
      label: 'SATURDAY APRIL 11',
      entries: convertEntries(saturday),
    },
    {
      date: '2025-04-12',
      label: 'SUNDAY APRIL 12',
      entries: convertEntries(sunday),
    },
  ],
}

writeFileSync(
  'public/schedules/destiny-rising-2025.json',
  JSON.stringify(schedule, null, 2)
)

const manifest = {
  schedules: [
    { id: 'destiny-rising-2025', name: 'Destiny Rising 2025', file: 'destiny-rising-2025.json' },
  ],
}

writeFileSync(
  'public/schedules/index.json',
  JSON.stringify(manifest, null, 2)
)

console.log(`✓ Generated destiny-rising-2025.json (${saturday.length + sunday.length} entries)`)
console.log(`✓ Generated index.json`)
