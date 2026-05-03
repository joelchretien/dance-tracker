import { describe, it, expect } from 'vitest'
import { validateSchedule, validateManifest } from '@/lib/validate-schedule'

function validSchedule() {
  return {
    meta: { id: 'test-2026', name: 'Test Comp 2026' },
    days: [
      {
        label: 'FRIDAY MAY 1',
        date: '2026-05-01',
        entries: [
          { type: 'dance', time: '8:00 AM', title: 'Lucky 7', num: 1, dancers: ['Alice'], studio: 'Acme' },
          { type: 'awards', time: '12:00 PM', title: 'AWARDS' },
          { type: 'break', time: '12:30 PM', title: 'LUNCH' },
        ],
      },
    ],
  }
}

describe('validateSchedule', () => {
  it('accepts a valid schedule', () => {
    expect(() => validateSchedule(validSchedule())).not.toThrow()
  })

  it('rejects non-object root', () => {
    expect(() => validateSchedule(null)).toThrow(/root/)
    expect(() => validateSchedule([])).toThrow(/root/)
    expect(() => validateSchedule('hi')).toThrow(/root/)
  })

  it('rejects missing meta', () => {
    expect(() => validateSchedule({ days: [] })).toThrow(/meta/)
  })

  it('rejects empty meta.id', () => {
    const s = validSchedule()
    s.meta.id = ''
    expect(() => validateSchedule(s)).toThrow(/meta\.id/)
  })

  it('rejects missing meta.name', () => {
    const s = validSchedule()
    delete (s.meta as Partial<typeof s.meta>).name
    expect(() => validateSchedule(s)).toThrow(/meta\.name/)
  })

  it('rejects missing days array', () => {
    expect(() => validateSchedule({ meta: { id: 'a', name: 'b' } })).toThrow(/days/)
  })

  it('rejects empty days array', () => {
    expect(() => validateSchedule({ meta: { id: 'a', name: 'b' }, days: [] })).toThrow(/days/)
  })

  it('rejects malformed date', () => {
    const s = validSchedule()
    s.days[0].date = '2026/05/01'
    expect(() => validateSchedule(s)).toThrow(/date/)
  })

  it('rejects entries that are not arrays', () => {
    const s = validSchedule()
    ;(s.days[0] as { entries: unknown }).entries = 'not an array'
    expect(() => validateSchedule(s)).toThrow(/entries/)
  })

  it('rejects unknown entry type (catches type:"danse" typo)', () => {
    const s = validSchedule()
    ;(s.days[0].entries[0] as { type: string }).type = 'danse'
    expect(() => validateSchedule(s)).toThrow(/danse/)
  })

  it('rejects missing entry time', () => {
    const s = validSchedule()
    delete (s.days[0].entries[0] as Partial<{ time: string }>).time
    expect(() => validateSchedule(s)).toThrow(/time/)
  })

  it('rejects empty entry time', () => {
    const s = validSchedule()
    s.days[0].entries[0].time = ''
    expect(() => validateSchedule(s)).toThrow(/time/)
  })

  it('rejects non-number num', () => {
    const s = validSchedule()
    ;(s.days[0].entries[0] as { num: unknown }).num = '1'
    expect(() => validateSchedule(s)).toThrow(/num/)
  })

  it('rejects non-array dancers', () => {
    const s = validSchedule()
    ;(s.days[0].entries[0] as { dancers: unknown }).dancers = 'Alice'
    expect(() => validateSchedule(s)).toThrow(/dancers/)
  })

  it('rejects non-string dancer name', () => {
    const s = validSchedule()
    ;(s.days[0].entries[0] as { dancers: unknown[] }).dancers = ['Alice', 42]
    expect(() => validateSchedule(s)).toThrow(/dancers\[1\]/)
  })

  it('allows dance entry without optional fields', () => {
    const s = {
      meta: { id: 'x', name: 'y' },
      days: [{ label: 'D', date: '2026-01-01', entries: [{ type: 'dance', time: '8:00 AM', title: 't' }] }],
    }
    expect(() => validateSchedule(s)).not.toThrow()
  })

  it('reports the failing path in the error message', () => {
    const s = validSchedule()
    s.days.push({
      label: 'SAT',
      date: '2026-05-02',
      entries: [
        { type: 'dance', time: '8:00 AM', title: 'OK' },
        { type: 'awards', time: '', title: 'AWARDS' },
      ],
    })
    expect(() => validateSchedule(s)).toThrow(/days\[1\]\.entries\[1\]\.time/)
  })

  it('rejects unparseable times even when string and non-empty', () => {
    const s = validSchedule()
    s.days[0].entries[0].time = '13:00 PM'
    expect(() => validateSchedule(s)).toThrow(/unparseable time/)
  })

  it('rejects out-of-range hour (12-hour notation)', () => {
    const s = validSchedule()
    s.days[0].entries[0].time = '0:00 AM'
    expect(() => validateSchedule(s)).toThrow(/unparseable time/)
  })

  it('rejects out-of-range minute', () => {
    const s = validSchedule()
    s.days[0].entries[0].time = '5:60 PM'
    expect(() => validateSchedule(s)).toThrow(/unparseable time/)
  })

  it('rejects non-chronological entries within a day', () => {
    const s = validSchedule()
    s.days[0].entries = [
      { type: 'dance', time: '10:00 AM', title: 'B' },
      { type: 'dance', time: '9:00 AM', title: 'A' },
    ]
    expect(() => validateSchedule(s)).toThrow(/chronological/)
  })

  it('accepts entries at the same time within a day', () => {
    // Two entries at the same scheduled time (e.g. an awards entry sharing
    // a time with the preceding dance) is legitimate, not a chronology
    // violation.
    const s = validSchedule()
    s.days[0].entries = [
      { type: 'dance', time: '12:00 PM', title: 'A' },
      { type: 'awards', time: '12:00 PM', title: 'AWARDS' },
    ]
    expect(() => validateSchedule(s)).not.toThrow()
  })

  it('rejects non-number age', () => {
    const s = validSchedule()
    ;(s.days[0].entries[0] as unknown as { age: unknown }).age = '12'
    expect(() => validateSchedule(s)).toThrow(/age/)
  })

  it('rejects non-string category', () => {
    const s = validSchedule()
    ;(s.days[0].entries[0] as unknown as { category: unknown }).category = 42
    expect(() => validateSchedule(s)).toThrow(/category/)
  })

  it('rejects route-unsafe meta.id', () => {
    const s = validSchedule()
    s.meta.id = 'evil:id'
    expect(() => validateSchedule(s)).toThrow(/meta\.id/)
  })
})

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    const m = { schedules: [{ id: 'otf-2026', name: 'OTF 2026' }] }
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('accepts multiple schedule entries', () => {
    const m = {
      schedules: [
        { id: 'otf-2026', name: 'OTF 2026' },
        { id: 'world-finals_2027', name: 'World Finals 2027' },
      ],
    }
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('rejects non-object root', () => {
    expect(() => validateManifest(null)).toThrow(/manifest/)
    expect(() => validateManifest([])).toThrow(/manifest/)
    expect(() => validateManifest('hi')).toThrow(/manifest/)
  })

  it('rejects missing schedules array', () => {
    expect(() => validateManifest({})).toThrow(/schedules/)
    expect(() => validateManifest({ schedules: 'nope' })).toThrow(/schedules/)
  })

  it('rejects missing or empty id', () => {
    expect(() => validateManifest({ schedules: [{ name: 'X' }] })).toThrow(/id/)
    expect(() => validateManifest({ schedules: [{ id: '', name: 'X' }] })).toThrow(/id/)
  })

  it('rejects unsafe id characters (matches route + schedule-file grammar)', () => {
    // Anything outside [a-zA-Z0-9_-] is rejected, matching the
    // SAFE_ID_RE used by the route and schedule-file validator.
    expect(() => validateManifest({ schedules: [{ id: 'evil:id', name: 'X' }] })).toThrow(/id/)
    expect(() => validateManifest({ schedules: [{ id: 'has space', name: 'X' }] })).toThrow(/id/)
    expect(() => validateManifest({ schedules: [{ id: '../escape', name: 'X' }] })).toThrow(/id/)
  })

  it('rejects missing or empty name', () => {
    expect(() => validateManifest({ schedules: [{ id: 'otf' }] })).toThrow(/name/)
    expect(() => validateManifest({ schedules: [{ id: 'otf', name: '' }] })).toThrow(/name/)
  })

  it('rejects duplicate ids', () => {
    const m = {
      schedules: [
        { id: 'otf-2026', name: 'A' },
        { id: 'otf-2026', name: 'B' },
      ],
    }
    expect(() => validateManifest(m)).toThrow(/duplicate/)
  })

  it('error messages include the index of the offending entry', () => {
    const m = {
      schedules: [
        { id: 'otf-2026', name: 'OTF 2026' },
        { id: 'otf-2026', name: 'B' },
      ],
    }
    // Duplicate is on index 1 — the path-style message should let the
    // author find the bad entry without scrolling.
    expect(() => validateManifest({ schedules: [{ id: 'a', name: 'A' }, {}] })).toThrow(/\[1\]/)
    void m
  })
})
