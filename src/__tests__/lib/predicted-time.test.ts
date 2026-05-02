import { describe, it, expect } from 'vitest'
import { formatMinutesAsTime, predictedTime } from '@/lib/predicted-time'

describe('formatMinutesAsTime', () => {
  it('formats midnight', () => {
    expect(formatMinutesAsTime(0)).toBe('12:00 AM')
  })
  it('formats noon', () => {
    expect(formatMinutesAsTime(720)).toBe('12:00 PM')
  })
  it('formats AM times', () => {
    expect(formatMinutesAsTime(615)).toBe('10:15 AM')
  })
  it('formats PM times', () => {
    expect(formatMinutesAsTime(1290)).toBe('9:30 PM')
  })
  it('rounds fractional minutes', () => {
    expect(formatMinutesAsTime(615.6)).toBe('10:16 AM')
  })
  it('wraps past midnight', () => {
    expect(formatMinutesAsTime(1500)).toBe('1:00 AM')
  })
  it('wraps negative values', () => {
    expect(formatMinutesAsTime(-30)).toBe('11:30 PM')
  })
})

describe('predictedTime', () => {
  it('shifts forward by positive offset', () => {
    expect(predictedTime('4:30 PM', 15)).toBe('4:45 PM')
  })
  it('shifts backward by negative offset', () => {
    expect(predictedTime('4:30 PM', -10)).toBe('4:20 PM')
  })
  it('returns input unchanged for unparseable time', () => {
    expect(predictedTime('TBD', 10)).toBe('TBD')
  })
  it('handles AM→PM crossover', () => {
    expect(predictedTime('11:55 AM', 10)).toBe('12:05 PM')
  })
  it('handles zero offset', () => {
    expect(predictedTime('9:00 AM', 0)).toBe('9:00 AM')
  })
})
