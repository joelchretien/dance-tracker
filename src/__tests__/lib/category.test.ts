import { describe, it, expect } from 'vitest'
import { extractSubtitle } from '@/lib/category'

describe('extractSubtitle', () => {
  it('returns last 2 segments', () => {
    expect(extractSubtitle('Pre-Competitive · Nova · Jazz · Small Group')).toBe('Jazz · Small Group')
  })
  it('returns full string if only 2 segments', () => {
    expect(extractSubtitle('Jazz · Solo')).toBe('Jazz · Solo')
  })
  it('returns single segment if only 1', () => {
    expect(extractSubtitle('Solo')).toBe('Solo')
  })
  it('returns empty for undefined', () => {
    expect(extractSubtitle(undefined)).toBe('')
  })
})
