/**
 * The evidence model.
 *
 * Phase 4 hashed evidence at export time. That was enough to print a digest, but it is
 * not integrity: a hash computed from the record at the moment you print it will always
 * match the record, because it was derived from it. Integrity means the digest is fixed
 * at intake and checked later against the item as it stands.
 *
 * So the digest moves to upload time, and `verifyIntegrity` recomputes and compares. The
 * fixture has no file bytes, so the digest covers the item's identity and provenance —
 * the fields a challenge actually disputes. A real deployment hashes the bytes; the
 * comparison logic is identical either way, which is why it lives here rather than
 * inside a component.
 *
 * Custody is append-only. There is no function in this module that edits or removes a
 * custody event, and that is deliberate: a trail somebody can tidy up is not a trail.
 */

import { hashOf } from '../defensibility/hash'

/* ------------------------------------------------------------------ *
 * States
 * ------------------------------------------------------------------ */

/**
 * s.11 gives the committee the powers of a civil court over what it admits. An item is
 * submitted, considered, and then either admitted to the record or refused — and a
 * refusal without a recorded reason is the thing that gets an inquiry set aside, so the
 * reason is required by the type, not by a validation rule someone can skip.
 */
export type EvidenceState = 'Submitted' | 'Under review' | 'Admitted' | 'Not admitted'

export const EVIDENCE_STATES: EvidenceState[] = ['Submitted', 'Under review', 'Admitted', 'Not admitted']

export const STATE_PILL: Record<EvidenceState, string> = {
  Submitted: 'badge-open',
  'Under review': 'badge-progress',
  Admitted: 'badge-completed',
  'Not admitted': 'badge-overdue',
}

/** Colour is never the only signal — every state carries a word and an icon name. */
export const STATE_ICON: Record<EvidenceState, string> = {
  Submitted: 'inbox',
  'Under review': 'eye',
  Admitted: 'check',
  'Not admitted': 'x',
}

export const STATE_MEANING: Record<EvidenceState, string> = {
  Submitted: 'Filed by a party. The committee has not yet considered it.',
  'Under review': 'The committee is considering whether to admit it.',
  Admitted: 'On the record. The inquiry may rely on it.',
  'Not admitted': 'Refused, with a recorded reason. It remains on file but is not relied on.',
}

/* ------------------------------------------------------------------ *
 * Custody
 * ------------------------------------------------------------------ */

export type CustodyAction =
  | 'Received'
  | 'Viewed'
  | 'Previewed'
  | 'Downloaded'
  | 'State changed'
  | 'Superseded'
  | 'Integrity verified'

export interface CustodyEntry {
  id: string
  at: string
  actorId: string
  actorName: string
  actorRole: string
  action: CustodyAction
  detail: string
}

/* ------------------------------------------------------------------ *
 * The item
 * ------------------------------------------------------------------ */

export interface EvidenceRecord {
  id: string
  caseId: string
  /** Exhibit number, assigned only once the item is admitted to the record. */
  exhibitNo: string | null
  label: string
  note: string
  /** Set at intake and never recomputed. Comparison is what proves integrity. */
  hash: string
  sizeKb: number
  mimeType: string
  uploadedBy: string
  uploadedByName: string
  uploadedByRole: string
  uploadedAt: string
  state: EvidenceState
  /** Required when the state is 'Not admitted'. */
  stateReason: string | null
  supplementary: boolean
  custody: CustodyEntry[]
  /** Id of the item this one replaces. The old one stays, marked superseded. */
  supersedes: string | null
  superseded: boolean
  version: number
}

/** The fields the digest commits to. Changing any of them breaks verification. */
export const integrityPayload = (e: EvidenceRecord) => ({
  label: e.label,
  note: e.note,
  sizeKb: e.sizeKb,
  mimeType: e.mimeType,
  uploadedBy: e.uploadedBy,
  uploadedAt: e.uploadedAt,
  supplementary: e.supplementary,
})

/** Digest for a new item, computed once at intake. */
export const computeHash = (e: Omit<EvidenceRecord, 'hash' | 'custody' | 'id'>) =>
  hashOf(integrityPayload(e as EvidenceRecord))

export interface VerifyResult {
  ok: boolean
  expected: string
  actual: string
  checkedAt: string
}

/**
 * Recomputes the digest and compares it with the one recorded at intake.
 *
 * This is the only function that can say an item is unaltered, and it can only say it
 * because the expected value was fixed before the comparison existed.
 */
export async function verifyIntegrity(e: EvidenceRecord): Promise<VerifyResult> {
  const actual = await hashOf(integrityPayload(e))
  return { ok: actual === e.hash, expected: e.hash, actual, checkedAt: new Date().toISOString() }
}

/* ------------------------------------------------------------------ *
 * Upload validation
 * ------------------------------------------------------------------ */

export const MAX_UPLOAD_KB = 25 * 1024

export const ACCEPTED = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'message/rfc822',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/**
 * Rejections name the specific problem and the limit.
 *
 * "Invalid file" tells a complainant nothing and leaves them unable to comply — which
 * matters more here than in most products, because the person hitting this error may be
 * trying to file evidence of harassment against a deadline.
 */
export function validateUpload(file: { name: string; size: number; type: string }): string | null {
  const kb = Math.round(file.size / 1024)
  if (file.size === 0) return `“${file.name}” is empty. Check the file and try again.`
  if (kb > MAX_UPLOAD_KB) {
    return `“${file.name}” is ${(kb / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_KB / 1024} MB — split it or send it to the committee directly.`
  }
  if (file.type && !ACCEPTED.includes(file.type)) {
    return `“${file.name}” is a ${file.type.split('/').pop()?.toUpperCase() ?? 'file'} file. Accepted: PDF, PNG, JPEG, WebP, plain text, email, Word.`
  }
  return null
}

export const mimeLabel = (mime: string) =>
  ({
    'application/pdf': 'PDF',
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
    'text/plain': 'TXT',
    'message/rfc822': 'EML',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  })[mime] ?? mime.split('/').pop()?.toUpperCase() ?? 'FILE'

export const isPreviewable = (mime: string) => mime === 'application/pdf' || mime.startsWith('image/')
