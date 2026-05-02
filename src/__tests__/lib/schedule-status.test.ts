import { describe, it, expect } from 'vitest'
import { classifyScheduleStatus } from '@/lib/schedule-status'

describe('classifyScheduleStatus', () => {
  it('returns on-schedule within 5 min', () => {
    expect(classifyScheduleStatus(480, 483, true, '')).toEqual({ kind: 'on-schedule' })
    expect(classifyScheduleStatus(480, 480, true, '')).toEqual({ kind: 'on-schedule' })
    expect(classifyScheduleStatus(480, 485, true, '')).toEqual({ kind: 'on-schedule' })
  })

  it('returns behind for 6-30 min', () => {
    expect(classifyScheduleStatus(480, 490, true, '')).toEqual({ kind: 'behind', minutes: 10 })
    expect(classifyScheduleStatus(480, 510, true, '')).toEqual({ kind: 'behind', minutes: 30 })
  })

  it('returns way-behind for 30+ min', () => {
    expect(classifyScheduleStatus(480, 520, true, '')).toEqual({ kind: 'way-behind', minutes: 40 })
  })

  it('returns ahead when running early', () => {
    expect(classifyScheduleStatus(480, 470, true, '')).toEqual({ kind: 'ahead', minutes: 10 })
  })

  it('returns not-started for invalid time', () => {
    expect(classifyScheduleStatus(-1, 480, true, '')).toEqual({ kind: 'not-started' })
  })

  it('returns wrong-day when entry day does not match today', () => {
    expect(classifyScheduleStatus(480, 480, false, 'Saturday schedule')).toEqual({
      kind: 'wrong-day',
      dayLabel: 'Saturday schedule',
    })
  })

  describe('with onScheduleThreshold = 0 (anchored)', () => {
    it('returns on-schedule only at exactly 0 (after rounding)', () => {
      expect(classifyScheduleStatus(480, 480, true, '', 0)).toEqual({ kind: 'on-schedule' })
      expect(classifyScheduleStatus(480, 480.4, true, '', 0)).toEqual({ kind: 'on-schedule' })
    })

    it('returns behind for 1 minute behind', () => {
      expect(classifyScheduleStatus(480, 481, true, '', 0)).toEqual({ kind: 'behind', minutes: 1 })
    })

    it('returns ahead for 1 minute ahead', () => {
      expect(classifyScheduleStatus(480, 479, true, '', 0)).toEqual({ kind: 'ahead', minutes: 1 })
    })

    it('still uses 30-min boundary for way-behind', () => {
      expect(classifyScheduleStatus(480, 510, true, '', 0)).toEqual({ kind: 'behind', minutes: 30 })
      expect(classifyScheduleStatus(480, 511, true, '', 0)).toEqual({ kind: 'way-behind', minutes: 31 })
    })
  })
})
