export function levenshteinDistance(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al

  let prevRow = Array.from({ length: bl + 1 }, (_, j) => j)
  for (let i = 1; i <= al; i++) {
    const currRow = [i]
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currRow.push(Math.min(prevRow[j]! + 1, currRow[j - 1]! + 1, prevRow[j - 1]! + cost))
    }
    prevRow = currRow
  }
  return prevRow[bl]!
}

/**
 * Finds the candidate that looks like a likely typo of `value` — close enough in edit distance
 * to be suspicious, but not already an exact (case-insensitive) match — or null if none qualifies.
 * Used to power a non-blocking "did you mean X?" nudge, never a hard validation error.
 */
export function findClosestMatch(value: string, candidates: string[]): string | null {
  const normalizedValue = value.trim().toLowerCase()
  if (!normalizedValue) return null

  let best: string | null = null
  let bestDistance = Infinity
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.trim().toLowerCase()
    if (normalizedCandidate === normalizedValue) continue
    const distance = levenshteinDistance(normalizedValue, normalizedCandidate)
    const threshold = Math.max(
      1,
      Math.floor(Math.min(normalizedValue.length, normalizedCandidate.length) * 0.3),
    )
    if (distance <= threshold && distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}
