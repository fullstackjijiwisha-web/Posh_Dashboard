/**
 * Tiny fuzzy scorer — no dependency.
 *
 * Characters of the query must appear in order in the haystack. Consecutive matches
 * and matches at word starts score higher. Returns null when the query does not match.
 * Sub-millisecond on a few hundred items; the palette stays under 50ms.
 */

export interface FuzzyHit {
  score: number
  indices: number[]
}

export function fuzzyScore(query: string, haystack: string): FuzzyHit | null {
  const q = query.trim().toLowerCase()
  if (!q) return { score: 0, indices: [] }

  const h = haystack.toLowerCase()
  let qi = 0
  let score = 0
  let streak = 0
  const indices: number[] = []

  for (let hi = 0; hi < h.length && qi < q.length; hi++) {
    if (h[hi] !== q[qi]) {
      streak = 0
      continue
    }
    indices.push(hi)
    streak += 1
    score += 10 + streak * 4
    // Word-boundary bonus.
    if (hi === 0 || /[\s\-_/.:]/.test(h[hi - 1]!)) score += 18
    qi += 1
  }

  if (qi < q.length) return null
  // Prefer shorter haystacks when scores are close.
  score -= Math.max(0, h.length - q.length) * 0.15
  return { score, indices }
}

/** Rank a list of items by fuzzy score against one or more searchable strings. */
export function fuzzyRank<T>(
  query: string,
  items: T[],
  texts: (item: T) => string[],
): Array<{ item: T; score: number }> {
  const q = query.trim()
  if (!q) return items.map((item) => ({ item, score: 0 }))

  const hits: Array<{ item: T; score: number }> = []
  for (const item of items) {
    let best: FuzzyHit | null = null
    for (const text of texts(item)) {
      const hit = fuzzyScore(q, text)
      if (hit && (!best || hit.score > best.score)) best = hit
    }
    if (best) hits.push({ item, score: best.score })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits
}
