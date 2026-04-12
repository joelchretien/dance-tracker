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
