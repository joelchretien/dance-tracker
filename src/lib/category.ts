/**
 * Extract a short subtitle from a full category string.
 * Takes the last 2 segments (e.g., "Jazz · Small Group" from
 * "Pre-Competitive · Nova · Jazz · Small Group").
 */
export function extractSubtitle(category: string | undefined): string {
  if (!category) return ''
  const parts = category.split(' · ')
  return parts.slice(-2).join(' · ')
}

/**
 * Reorder a 4-segment "Level · Division N · Genre · Format" category to
 * "Genre · Format · Level Div N" so the variable, distinguishing parts come
 * first. Falls back to the original string if it doesn't match the pattern.
 */
export function formatCategoryHeader(category: string): string {
  const parts = category.split(' · ')
  if (parts.length !== 4) return category

  const [level, division, genre, format] = parts
  const divisionShort = division.replace(/^Division\s+/i, 'Div ')
  return `${genre} · ${format} · ${level} ${divisionShort}`
}

