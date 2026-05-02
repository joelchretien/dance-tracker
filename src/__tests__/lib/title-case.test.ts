import { describe, it, expect } from 'vitest'
import { titleCaseDanceTitle } from '@/lib/title-case'

describe('titleCaseDanceTitle', () => {
  it('converts ALL CAPS to title case', () => {
    expect(titleCaseDanceTitle('GOOD MORNING')).toBe('Good Morning')
    expect(titleCaseDanceTitle('LUCKY 7')).toBe('Lucky 7')
  })

  it('handles single words', () => {
    expect(titleCaseDanceTitle('PHANTOMS')).toBe('Phantoms')
    expect(titleCaseDanceTitle('TITANIUM')).toBe('Titanium')
  })

  it('keeps small words lowercase in middle', () => {
    expect(titleCaseDanceTitle('SONG FOR MY FATHER')).toBe('Song for My Father')
    expect(titleCaseDanceTitle('GETCHA HEAD IN THE GAME')).toBe('Getcha Head in the Game')
  })

  it('capitalizes small words at start or end', () => {
    expect(titleCaseDanceTitle('THE HEIST')).toBe('The Heist')
    expect(titleCaseDanceTitle('A LITTLE BIT OF')).toBe('A Little Bit Of')
  })

  it('handles apostrophes correctly', () => {
    expect(titleCaseDanceTitle("I'LL NEVER LOVE AGAIN")).toBe("I'll Never Love Again")
    expect(titleCaseDanceTitle("THAT'S LIFE")).toBe("That's Life")
    expect(titleCaseDanceTitle("I CAN'T MAKE THE HILLS")).toBe("I Can't Make the Hills")
  })

  it('handles empty string', () => {
    expect(titleCaseDanceTitle('')).toBe('')
  })

  it('handles already-cased input', () => {
    expect(titleCaseDanceTitle('Lucky 7')).toBe('Lucky 7')
  })

  it('handles punctuation', () => {
    expect(titleCaseDanceTitle('NEW YORK, NEW YORK')).toBe('New York, New York')
  })
})
