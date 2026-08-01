/**
 * The alias vocabulary — how a person is named when identity must not appear.
 *
 * Written here rather than inside the PDF renderer because two things need it, and only
 * one of them exists yet:
 *   · the redacted Defensibility Pack (this phase)
 *   · Presenter Mode (Phase 2), which masks the same values on screen
 *
 * If those two ever disagree — a name masked on screen but printed in the export, or two
 * different aliases for the same witness — the confidentiality claim collapses. So there
 * is one vocabulary, and Phase 2 should consume this module rather than write another.
 *
 * The rules, which come from the critique's Presenter Mode specification:
 *   · parties become role aliases, stable per case, so the same person is always
 *     "Witness 1" within that case and never "Witness 1" in one section and "Witness 2"
 *     in the next
 *   · committee members become their seat
 *   · contact details become `•••• ••••` at the SAME CHARACTER WIDTH, so nothing reflows
 *     when masking is toggled — a layout that jumps betrays which fields were populated
 *   · case IDs, dates, clocks, counts and workflow states are never masked, because the
 *     whole point is that the process stays demonstrable
 */

import { userById } from '../data/users'
import { ROLE_LABEL, type Party, type Role } from '../data/types'

export interface AliasOptions {
  /** When false every function returns the real value unchanged. */
  redact: boolean
}

/* ------------------------------------------------------------------ *
 * Parties
 * ------------------------------------------------------------------ */

/**
 * A party's alias.
 *
 * The fixture already carries `maskedName` ("Complainant A" / "Respondent B"), which is
 * the label the on-screen masking uses. Reusing it rather than minting a parallel scheme
 * means a reader who has seen the app recognises the same names in the export.
 */
export function aliasParty(party: Party, { redact }: AliasOptions): string {
  return redact ? party.maskedName : party.actualName
}

/** Witnesses are numbered per case, in the order they appear on the record. */
export function witnessAlias(index: number): string {
  return `Witness ${index + 1}`
}

/* ------------------------------------------------------------------ *
 * Committee
 * ------------------------------------------------------------------ */

const SEAT_ALIAS: Partial<Record<Role, string>> = {
  presiding_officer: 'Presiding Officer',
  external_member: 'External Member',
  posh_admin: 'POSH Admin',
  hr_spoc: 'HR SPOC',
  super_admin: 'Company Owner',
  employee: 'Complainant',
  management: 'Management',
}

/**
 * A committee member's alias — their seat.
 *
 * Internal members are numbered because a board can hold more than one, and "Internal
 * Member" repeated three times would make the attendance record unreadable. Numbering is
 * by position in the board's own member list, so it is stable across sections and across
 * regenerations of the same pack.
 */
export function aliasMember(
  userId: string,
  { redact }: AliasOptions,
  internalOrder: string[] = [],
): string {
  const user = userById(userId)
  if (!redact) return user?.name ?? userId
  if (!user) return 'Unknown participant'
  if (user.role === 'ic_member') {
    const n = internalOrder.indexOf(userId)
    return n >= 0 ? `Internal Member ${n + 1}` : 'Internal Member'
  }
  return SEAT_ALIAS[user.role] ?? ROLE_LABEL[user.role]
}

/** The internal members of a board, in a fixed order, for stable numbering. */
export function internalOrderOf(memberIds: string[]): string[] {
  return memberIds.filter((id) => userById(id)?.role === 'ic_member')
}

/* ------------------------------------------------------------------ *
 * Contact details and free text
 * ------------------------------------------------------------------ */

/**
 * Masks a value to the same visible width.
 *
 * Equal width matters more than it sounds: if the mask were a fixed `••••` then a long
 * email and a short one would collapse to the same length, and a reader comparing two
 * redacted pages could tell which fields had content. Preserving width — and the `@` and
 * `.` positions in an address — keeps the layout identical and leaks nothing.
 */
export function maskValue(value: string | null | undefined, { redact }: AliasOptions): string {
  if (!redact) return value ?? '—'
  if (!value) return '—'
  return value.replace(/[^\s@.\-+()]/g, '•')
}

/**
 * A free-text block in a redacted pack.
 *
 * Findings, minutes and notes are the most sensitive prose in the record, and unlike a
 * name they cannot be aliased — the content itself identifies. A redacted pack therefore
 * withholds the body and says so, rather than printing a paragraph of dots that a reader
 * might mistake for an empty field.
 */
export function redactProse(text: string, { redact }: AliasOptions): string {
  if (!redact) return text
  const words = text.trim().split(/\s+/).length
  return `[Withheld in the redacted pack — ${words} words. Available in the unredacted version.]`
}

/** Location and department generalise rather than disappear. */
export function aliasPlace(place: string, { redact }: AliasOptions, index = 0): string {
  return redact ? `Location ${index + 1}` : place
}
