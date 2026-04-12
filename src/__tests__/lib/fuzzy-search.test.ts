import { describe, it, expect } from 'vitest'
import { fuzzyScore } from '@/lib/fuzzy-search'

describe('fuzzyScore', () => {
  it('returns > 0 for exact match', () => {
    expect(fuzzyScore('BOOM CLAP', 'BOOM CLAP')).toBeGreaterThan(0)
  })

  it('returns > 0 for prefix match', () => {
    expect(fuzzyScore('BOOM', 'BOOM CLAP')).toBeGreaterThan(0)
  })

  it('returns > 0 for case-insensitive match', () => {
    expect(fuzzyScore('boom', 'BOOM CLAP')).toBeGreaterThan(0)
  })

  it('returns > 0 for fuzzy subsequence match', () => {
    expect(fuzzyScore('bcl', 'BOOM CLAP')).toBeGreaterThan(0)
  })

  it('returns 0 for no match', () => {
    expect(fuzzyScore('xyz', 'BOOM CLAP')).toBe(0)
  })

  it('returns 0 when query is longer than target', () => {
    expect(fuzzyScore('BOOM CLAP EXTRA', 'BOOM CLAP')).toBe(0)
  })

  it('returns > 0 for empty query', () => {
    expect(fuzzyScore('', 'BOOM CLAP')).toBeGreaterThan(0)
  })

  it('scores exact match higher than fuzzy match', () => {
    const exact = fuzzyScore('SPELL', 'SPELL')
    const fuzzy = fuzzyScore('SPELL', 'SPELLBOUND')
    expect(exact).toBeGreaterThan(fuzzy)
  })

  it('scores word-boundary match higher than mid-word', () => {
    const boundary = fuzzyScore('cl', 'BOOM CLAP')  // C at word start
    const midword = fuzzyScore('cl', 'BICYCLE')       // C mid-word
    expect(boundary).toBeGreaterThan(midword)
  })

  it('scores consecutive matches higher than scattered', () => {
    const consecutive = fuzzyScore('boo', 'BOOM CLAP')
    const scattered = fuzzyScore('bcp', 'BOOM CLAP')
    expect(consecutive).toBeGreaterThan(scattered)
  })
})
