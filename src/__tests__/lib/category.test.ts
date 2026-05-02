import { describe, it, expect } from 'vitest'
import { extractSubtitle, formatCategoryHeader } from '@/lib/category'

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

describe('formatCategoryHeader', () => {
  it('reorders 4-segment categories with variable parts first', () => {
    expect(formatCategoryHeader('Competitive · Division 2 · Hip Hop · Line'))
      .toBe('Hip Hop · Line · Competitive Div 2')
  })
  it('shortens "Division N" to "Div N"', () => {
    expect(formatCategoryHeader('Adult · Division 5 · Tap · Large Group'))
      .toBe('Tap · Large Group · Adult Div 5')
  })
  it('returns original string for non-4-segment categories', () => {
    expect(formatCategoryHeader('Jazz · Solo')).toBe('Jazz · Solo')
    expect(formatCategoryHeader('Solo')).toBe('Solo')
  })
})

