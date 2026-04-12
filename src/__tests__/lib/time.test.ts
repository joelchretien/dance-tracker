import { describe, it, expect } from 'vitest'
import { parseTime, formatTimeDiff } from '@/lib/time'

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

describe('formatTimeDiff', () => {
  it('returns empty string for zero diff', () => {
    expect(formatTimeDiff(100, 100)).toBe('')
  })
  it('formats minutes only', () => {
    expect(formatTimeDiff(100, 145)).toBe('~45min')
  })
  it('formats hours only', () => {
    expect(formatTimeDiff(0, 120)).toBe('~2h')
  })
  it('formats hours and minutes', () => {
    expect(formatTimeDiff(0, 105)).toBe('~1h 45min')
  })
  it('wraps around midnight for negative diff', () => {
    // 23:00 (1380) to 1:00 (60): should be ~2h
    expect(formatTimeDiff(1380, 60)).toBe('~2h')
  })
  it('returns empty for invalid times', () => {
    expect(formatTimeDiff(-1, 100)).toBe('')
    expect(formatTimeDiff(100, -1)).toBe('')
  })
})
