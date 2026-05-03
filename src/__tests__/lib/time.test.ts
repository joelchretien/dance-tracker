import { describe, it, expect } from 'vitest'
import { parseTime, formatSameDayDiff, localDateString } from '@/lib/time'

describe('parseTime', () => {
  it('parses morning time', () => {
    expect(parseTime('8:03 AM')).toBe(483)
  })
  it('parses noon', () => {
    expect(parseTime('12:00 PM')).toBe(720)
  })
  it('parses midnight', () => {
    expect(parseTime('12:00 AM')).toBe(0)
  })
  it('parses afternoon', () => {
    expect(parseTime('2:13 PM')).toBe(14 * 60 + 13)
  })
  it('parses 11:59 PM', () => {
    expect(parseTime('11:59 PM')).toBe(23 * 60 + 59)
  })
  it('returns -1 for invalid', () => {
    expect(parseTime('')).toBe(-1)
    expect(parseTime('invalid')).toBe(-1)
  })
})

describe('formatSameDayDiff', () => {
  it('returns empty string for zero diff', () => {
    expect(formatSameDayDiff(100, 100)).toBe('')
  })
  it('formats minutes only', () => {
    expect(formatSameDayDiff(100, 145)).toBe('~45min')
  })
  it('formats hours only', () => {
    expect(formatSameDayDiff(0, 120)).toBe('~2h')
  })
  it('formats hours and minutes', () => {
    expect(formatSameDayDiff(0, 105)).toBe('~1h 45min')
  })
  it('returns empty when toMinutes < fromMinutes (same-day contract)', () => {
    // 23:00 (1380) to 1:00 (60): negative same-day diff → empty.
    // Callers crossing a day boundary suppress the call themselves;
    // this function refuses to invent a number that wrapped through
    // midnight.
    expect(formatSameDayDiff(1380, 60)).toBe('')
  })
  it('returns empty for invalid times', () => {
    expect(formatSameDayDiff(-1, 100)).toBe('')
    expect(formatSameDayDiff(100, -1)).toBe('')
  })
})

describe('localDateString', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(localDateString(new Date(2026, 3, 12))).toBe('2026-04-12')
  })

  it('pads single-digit month and day', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
