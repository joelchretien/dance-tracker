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
})
