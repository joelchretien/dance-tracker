import { describe, it, expect } from 'vitest'
import { parseScheduleDSL } from '@/lib/parse-schedule-dsl'

const META = { id: 'test-2026', name: 'Test 2026' }

describe('parseScheduleDSL', () => {
  it('parses a minimal valid schedule', () => {
    const dsl = `
D|2026-05-01|FRIDAY MAY 1
S|Solo|Novice|1|7|Jazz
E|1|8:00 AM|HELLO|A|1|Alice
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.meta).toBe(META)
    expect(out.days).toHaveLength(1)
    expect(out.days[0].entries).toEqual([
      {
        type: 'dance',
        time: '8:00 AM',
        title: 'HELLO',
        num: 1,
        studio: 'A',
        category: 'Novice · Division 1 · Jazz · Solo',
        dancers: ['Alice'],
        age: 7,
      },
    ])
  })

  it('parses awards and break entries', () => {
    const dsl = `
D|2026-05-01|FRIDAY MAY 1
S|Solo|Novice|1|7|Jazz
E|1|8:00 AM|HELLO|A|1|Alice
A|9:00 AM|AWARDS BLOCK 1
B|9:30 AM|LUNCH
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.days[0].entries).toHaveLength(3)
    expect(out.days[0].entries[1]).toEqual({ type: 'awards', time: '9:00 AM', title: 'AWARDS BLOCK 1' })
    expect(out.days[0].entries[2]).toEqual({ type: 'break', time: '9:30 AM', title: 'LUNCH' })
  })

  it('handles empty age field', () => {
    const dsl = `
D|2026-05-01|F
S|Duet/Trio|Competitive|3||Contemporary
E|1|8:00 AM|HELLO|A|2|Alice;Bob
`
    const out = parseScheduleDSL(dsl, META)
    const dance = out.days[0].entries[0]
    expect(dance).not.toHaveProperty('age')
  })

  it('drops empty studio field to undefined (validator allows missing)', () => {
    const dsl = `
D|2026-05-01|F
S|Solo|Novice|1|7|Jazz
E|1|8:00 AM|HELLO||1|Alice
`
    const out = parseScheduleDSL(dsl, META)
    const dance = out.days[0].entries[0]
    expect(dance).not.toHaveProperty('studio')
  })

  it('parses multiple semicolon-separated dancers', () => {
    const dsl = `
D|2026-05-01|F
S|Duet/Trio|Competitive|3|13|Jazz
E|1|8:00 AM|HEADS WILL ROLL|D|3|Alice; Bob ;Charlie
`
    const out = parseScheduleDSL(dsl, META)
    const dance = out.days[0].entries[0]
    expect(dance).toHaveProperty('dancers')
    expect((dance as { dancers: string[] }).dancers).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('omits dancers field when none given (group dance)', () => {
    const dsl = `
D|2026-05-01|F
S|Group|Competitive|3|13|Jazz
E|1|8:00 AM|HEADS WILL ROLL|D|6
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.days[0].entries[0]).not.toHaveProperty('dancers')
  })

  it('skips blank lines and comments', () => {
    const dsl = `
# This is a comment
D|2026-05-01|F

# inline comment
S|Solo|Novice|1|7|Jazz
E|1|8:00 AM|HELLO|A|1|Alice
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.days[0].entries).toHaveLength(1)
  })

  it('supports multiple days', () => {
    const dsl = `
D|2026-05-01|F
S|Solo|Novice|1|7|Jazz
E|1|8:00 AM|A|A|1|Alice
D|2026-05-02|S
S|Solo|Novice|1|7|Jazz
E|2|8:00 AM|B|A|1|Bob
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.days).toHaveLength(2)
    expect(out.days[0].date).toBe('2026-05-01')
    expect(out.days[1].date).toBe('2026-05-02')
    expect(out.days[1].entries).toHaveLength(1)
  })

  // Defensive cases — the previous parser had silent dereferences here.

  it('fails clearly when E appears before S', () => {
    const dsl = `
D|2026-05-01|F
E|1|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/before any S/)
  })

  it('fails clearly when E appears before D', () => {
    const dsl = `
S|Solo|Novice|1|7|Jazz
E|1|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/before any D/)
  })

  it('fails clearly with non-numeric num', () => {
    const dsl = `
D|2026-05-01|F
S|Solo|Novice|1|7|Jazz
E|abc|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/non-numeric num/)
  })

  it('fails clearly with unknown tag', () => {
    const dsl = `
D|2026-05-01|F
X|whatever
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/unknown line tag/)
  })

  it('error message includes the source line number', () => {
    const dsl = `D|2026-05-01|F
S|Solo|Novice|1|7|Jazz
E|1|8:00 AM|HELLO|A|1|Alice
E|abc|8:01 AM|OOPS|A|1|Bob`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/line 4/)
  })

  it('fails when the DSL is empty', () => {
    expect(() => parseScheduleDSL('', META)).toThrow(/no D/)
    expect(() => parseScheduleDSL('# just comments\n\n', META)).toThrow(/no D/)
  })

  // S* literal section header — used for special segments where the
  // structured "Group|Level|Div|Age|Style" format produces nonsense.
  // Sets the current section's category to the verbatim text and
  // clears age (no age semantics for free-form headers).
  describe('S* literal section header', () => {
    it('uses the literal text as the category', () => {
      const dsl = `D|2026-05-03|SUNDAY
S*|12 & UNDER BATTLE
E|561|8:09 PM|MY WAY|A|9
`
      const out = parseScheduleDSL(dsl, META)
      const entry = out.days[0].entries[0]
      expect(entry.type).toBe('dance')
      if (entry.type === 'dance') {
        expect(entry.category).toBe('12 & UNDER BATTLE')
        expect(entry.age).toBeUndefined()
      }
    })

    it('multiple S* sections each take effect for the entries that follow', () => {
      const dsl = `D|2026-05-03|SUNDAY
S*|FIRST OVERALL SOLO DIVISION 3
E|865|8:01 PM|IN THIS ROOM|D|1|Diya Singh
S*|FIRST OVERALL SOLO DIVISION 4
E|683|8:05 PM|ALL BY MYSELF|D|1|Emily Labarbera
`
      const out = parseScheduleDSL(dsl, META)
      const [a, b] = out.days[0].entries
      if (a.type === 'dance') expect(a.category).toBe('FIRST OVERALL SOLO DIVISION 3')
      if (b.type === 'dance') expect(b.category).toBe('FIRST OVERALL SOLO DIVISION 4')
    })

    it('rejects S* with no literal text', () => {
      const dsl = `D|2026-05-03|SUNDAY
S*|
E|561|8:09 PM|X|A|1
`
      expect(() => parseScheduleDSL(dsl, META)).toThrow(/literal category/)
    })

    it('rejects S* with the pipe-separator missing entirely', () => {
      // `S*` alone with no `|...` would be parsed as parts=['S*'],
      // length 1, which fails the same min-length check.
      const dsl = `D|2026-05-03|SUNDAY
S*
E|561|8:09 PM|X|A|1
`
      expect(() => parseScheduleDSL(dsl, META)).toThrow(/literal category/)
    })

    it('S* and S can coexist; later one wins', () => {
      // Documenting current behavior: section state is replaced on each
      // S/S* line, so an S followed by S* swaps the category from
      // structured to literal cleanly.
      const dsl = `D|2026-05-03|SUNDAY
S|Solo|Competitive|3|14|Jazz
E|400|8:00 AM|JAZZ HANDS|A|1|Alice
S*|FINALE
E|401|8:05 AM|GRAND FINALE|A|1|Bob
`
      const out = parseScheduleDSL(dsl, META)
      const [first, second] = out.days[0].entries
      if (first.type === 'dance') expect(first.category).toBe('Competitive · Division 3 · Jazz · Solo')
      if (second.type === 'dance') expect(second.category).toBe('FINALE')
    })
  })
})
