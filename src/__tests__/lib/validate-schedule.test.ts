import { describe, it, expect } from 'vitest'
import { validateSchedule } from '@/lib/validate-schedule'

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
})
