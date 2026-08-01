/**
 * SHA-256 over case material.
 *
 * Built on Web Crypto rather than a library: `crypto.subtle.digest` is in every browser
 * this app targets, and a hashing dependency would be a strange thing to add to a product
 * whose whole claim is that you can verify it yourself.
 *
 * This is the primitive Phase 5 (evidence integrity) and W5 (the Ledger) both need, so it
 * lives in its own module rather than inside the pack renderer.
 *
 * A HASH IS ONLY EVIDENCE IF IT IS REPRODUCIBLE. `JSON.stringify` is not: key order
 * follows insertion order, so two objects with identical content can serialise
 * differently and hash differently. `canonical()` sorts keys at every depth, so the same
 * record always produces the same digest regardless of how it was assembled.
 */

/** Deterministic serialisation: keys sorted at every level, arrays kept in order. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    // Arrays keep their order because order is meaningful — a chain of custody is a
    // sequence. Object keys do not, so they are sorted.
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
}

const encoder = new TextEncoder()

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

/** SHA-256 of a string, lowercase hex. */
export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text))
  return toHex(digest)
}

/** SHA-256 of any value, canonically serialised first. */
export const hashOf = (value: unknown) => sha256(canonical(value))

/**
 * Combines section hashes into one root.
 *
 * Order matters and is preserved: the root commits to the sections *in the order they
 * appear in the pack*, so reordering sections changes the root. That is the point — the
 * certificate attests to a specific document, not to a bag of parts.
 */
export const rootHash = (hashes: string[]) => sha256(hashes.join('\n'))

/**
 * `a1b2c3d4…9f8e7d6c` — enough to compare by eye, short enough to typeset.
 * The full digest is always available; this is for display only.
 */
export function shortHash(hash: string, edge = 8): string {
  if (hash.length <= edge * 2 + 1) return hash
  return `${hash.slice(0, edge)}…${hash.slice(-edge)}`
}

/** Groups a digest into readable blocks for the certificate page. */
export function groupHash(hash: string, size = 8): string {
  return (hash.match(new RegExp(`.{1,${size}}`, 'g')) ?? [hash]).join(' ')
}
