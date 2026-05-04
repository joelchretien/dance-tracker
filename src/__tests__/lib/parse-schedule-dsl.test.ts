import { describe, it, expect } from 'vitest'
import { parseScheduleDSL } from '@/lib/parse-schedule-dsl'

const META = { id: 'test-2026', name: 'Test 2026' }

describe('parseScheduleDSL', () => {
  it('parses a minimal valid schedule', () => {
    const dsl = `
D|2026-05-01|FRIDAY MAY 1
S|Novice · Division 1 · Jazz · Solo|7
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
S|Novice · Division 1 · Jazz · Solo|7
E|1|8:00 AM|HELLO|A|1|Alice
A|9:00 AM|AWARDS BLOCK 1
B|9:30 AM|LUNCH
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.days[0].entries).toHaveLength(3)
    expect(out.days[0].entries[1]).toEqual({ type: 'awards', time: '9:00 AM', title: 'AWARDS BLOCK 1' })
    expect(out.days[0].entries[2]).toEqual({ type: 'break', time: '9:30 AM', title: 'LUNCH' })
  })

  it('omits age when the section omits it', () => {
    const dsl = `
D|2026-05-01|F
S|Competitive · Division 3 · Contemporary · Duet/Trio
E|1|8:00 AM|HELLO|A|2|Alice;Bob
`
    const out = parseScheduleDSL(dsl, META)
    const e = out.days[0].entries[0]
    if (e.type === 'dance') expect(e.age).toBeUndefined()
  })

  it('drops empty studio field to undefined (validator allows missing)', () => {
    const dsl = `
D|2026-05-01|F
S|Novice · Division 1 · Jazz · Solo|7
E|1|8:00 AM|HELLO||1|Alice
`
    const out = parseScheduleDSL(dsl, META)
    const e = out.days[0].entries[0]
    if (e.type === 'dance') expect(e.studio).toBeUndefined()
  })

  it('parses multiple semicolon-separated dancers', () => {
    const dsl = `
D|2026-05-01|F
S|Novice · Division 1 · Jazz · Duet/Trio|7
E|1|8:00 AM|HELLO|A|3|Alice;Bob;Carol
`
    const out = parseScheduleDSL(dsl, META)
    const e = out.days[0].entries[0]
    if (e.type === 'dance') {
      expect(e.dancers).toEqual(['Alice', 'Bob', 'Carol'])
    }
  })

  it('omits dancers field when none given (group dance)', () => {
    const dsl = `
D|2026-05-01|F
S|Competitive · Division 3 · Jazz · Small Group|14
E|1|8:00 AM|GROUP NUMBER|A|7
`
    const out = parseScheduleDSL(dsl, META)
    const e = out.days[0].entries[0]
    if (e.type === 'dance') expect(e.dancers).toBeUndefined()
  })

  it('skips blank lines and comments', () => {
    const dsl = `
# this is a comment
D|2026-05-01|FRIDAY MAY 1

# another comment
S|Novice · Division 1 · Jazz · Solo|7

E|1|8:00 AM|HELLO|A|1|Alice
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.days[0].entries).toHaveLength(1)
  })

  it('supports multiple days', () => {
    const dsl = `
D|2026-05-01|FRIDAY MAY 1
S|Novice · Division 1 · Jazz · Solo|7
E|1|8:00 AM|FRI|A|1|Alice
D|2026-05-02|SATURDAY MAY 2
S|Novice · Division 1 · Jazz · Solo|7
E|2|9:00 AM|SAT|A|1|Bob
`
    const out = parseScheduleDSL(dsl, META)
    expect(out.days).toHaveLength(2)
    expect(out.days[0].date).toBe('2026-05-01')
    expect(out.days[1].date).toBe('2026-05-02')
  })

  it('age is sticky across entries within a section', () => {
    const dsl = `
D|2026-05-01|F
S|Novice · Division 1 · Jazz · Solo|7
E|1|8:00 AM|A|A|1|Alice
E|2|8:03 AM|B|A|1|Bob
S|Novice · Division 1 · Jazz · Solo|8
E|3|8:06 AM|C|A|1|Carol
`
    const out = parseScheduleDSL(dsl, META)
    const ages = out.days[0].entries
      .filter(e => e.type === 'dance')
      .map(e => (e.type === 'dance' ? e.age : undefined))
    expect(ages).toEqual([7, 7, 8])
  })

  it('rejects E line before any S section', () => {
    const dsl = `
D|2026-05-01|F
E|1|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/before any S/)
  })

  it('rejects S line with no category', () => {
    const dsl = `
D|2026-05-01|F
S|
E|1|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/category/)
  })

  it('rejects S line with no pipe', () => {
    const dsl = `
D|2026-05-01|F
S
E|1|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/category/)
  })

  it('rejects S line with non-numeric age', () => {
    const dsl = `
D|2026-05-01|F
S|Novice · Division 1 · Jazz · Solo|seven
E|1|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/non-numeric age/)
  })

  it('rejects E line with non-numeric num', () => {
    const dsl = `
D|2026-05-01|F
S|Novice · Division 1 · Jazz · Solo|7
E|abc|8:00 AM|HELLO|A|1|Alice
`
    expect(() => parseScheduleDSL(dsl, META)).toThrow(/non-numeric num/)
  })

  it('fails when the DSL is empty', () => {
    expect(() => parseScheduleDSL('', META)).toThrow(/no D/)
    expect(() => parseScheduleDSL('# just comments\n\n', META)).toThrow(/no D/)
  })

  it('free-form categories (special segments) pass through unchanged', () => {
    // The Ultimate Battle subsection labels and similar non-structured
    // categories should land in entries verbatim. The 4-segment
    // "Level · Division N · Style · Group" shape is just one common
    // case of free-form text; the parser doesn't enforce it.
    const dsl = `
D|2026-05-03|SUNDAY
S|12 & UNDER BATTLE
E|561|8:09 PM|MY WAY|A|9
S|FIRST OVERALL SOLO DIVISION 3
E|865|8:01 PM|IN THIS ROOM|D|1|Diya Singh
`
    const out = parseScheduleDSL(dsl, META)
    const cats = out.days[0].entries
      .filter(e => e.type === 'dance')
      .map(e => (e.type === 'dance' ? e.category : ''))
    expect(cats).toEqual(['12 & UNDER BATTLE', 'FIRST OVERALL SOLO DIVISION 3'])
  })

  it('a category with only some "·" segments still passes through', () => {
    // Two-segment categories like "Showcase · Finale" should not be
    // mangled. Only the rendering layer (formatCategoryHeader) does
    // any rearranging, and only on exact-4-segment strings.
    const dsl = `
D|2026-05-01|F
S|Showcase · Finale
E|1|8:00 AM|X|A|1|Alice
`
    const out = parseScheduleDSL(dsl, META)
    const e = out.days[0].entries[0]
    if (e.type === 'dance') expect(e.category).toBe('Showcase · Finale')
  })
})
