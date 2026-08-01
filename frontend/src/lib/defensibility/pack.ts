/**
 * Assembling the Defensibility Pack.
 *
 * Pure data: this module builds the ten sections and hashes them, and knows nothing about
 * PDFs. Keeping assembly separate from rendering means the same model can feed the Ledger
 * (W5) and the on-screen preview without either re-deriving it, and it can be tested
 * without a canvas.
 *
 * Each section is hashed on its own, then the section hashes combine into a root. That
 * shape is deliberate: if verification later fails, the root tells you the pack changed
 * and the section hashes tell you *which part*, which is the difference between "this
 * document is not trustworthy" and "the evidence index was altered".
 */

import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Case } from '../data/types'
import type { CaseFlow } from '../workflow/types'
import { STAGE_META } from '../workflow/types'
import { constitutionTests, sittingQuorumTests, allMet } from '../workflow/quorum'
import type { QuorumTest } from '../../components/workflow/Dials'
import { milestonesFor, hearingsFor, documentsFor } from '../data/caseDetail'
import { evidenceForCase } from '../data/evidence'
import { auditForCase } from '../data/audit'
import { userById } from '../data/users'
import { ORGANISATION } from '../data/organisation'
import { hashOf, rootHash, sha256 } from './hash'
import {
  aliasMember,
  aliasParty,
  aliasPlace,
  internalOrderOf,
  maskValue,
  redactProse,
  type AliasOptions,
} from './alias'

export interface PackOptions {
  /** Redacted packs use the alias vocabulary throughout. */
  redact: boolean
  /** The access log is long and sometimes not wanted; the certificate records the choice. */
  includeAccessLog: boolean
  /** Printed into the watermark, so a leaked copy names its recipient. */
  recipient: string
}

export interface PackRow {
  label: string
  value: string
  /** Rendered in monospace — hashes, IDs, dates in columns. */
  mono?: boolean
  /** Draws attention without relying on colour alone. */
  emphasis?: 'breach' | 'met' | 'none'
}

export interface PackSection {
  id: string
  title: string
  /** One line under the section title explaining what it proves. */
  blurb: string
  rows: PackRow[]
  /** Free-text blocks printed after the rows. */
  prose?: Array<{ heading?: string; body: string }>
  /** SHA-256 of this section's content. */
  hash: string
}

export interface DefensibilityPack {
  caseId: string
  subject: string
  status: string
  generatedAt: string
  generatedBy: string
  generatedByRole: string
  options: PackOptions
  sections: PackSection[]
  /** Commits to every section, in order. */
  rootHash: string
  organisation: string
}

/** The steps the dialog narrates while assembling. Order matches the printed pack. */
export const PACK_STEPS = [
  'Reading the case record',
  'Building the chronology',
  'Testing the compliance clocks',
  'Recording the constitution of the committee',
  'Testing quorum for each sitting',
  'Indexing and hashing evidence',
  'Indexing documents',
  'Collecting the recommendation and its revisions',
  'Compiling the access log',
  'Sealing the pack',
] as const

const yesNo = (b: boolean) => (b ? 'Yes' : 'No')

const testRows = (tests: QuorumTest[]): PackRow[] =>
  tests.map((t) => ({
    label: t.label,
    // The word carries the meaning; colour is only ever a reinforcement.
    value: `${t.met ? 'Met' : 'NOT MET'} — ${t.detail}`,
    emphasis: t.met ? 'met' : 'breach',
  }))

/**
 * Builds the pack.
 *
 * `onStep` is awaited between sections so the dialog can narrate real progress. The
 * hashing is genuine work — the delay a reader sees is assembly actually happening, not a
 * timer pretending.
 */
export async function buildPack(
  record: Case,
  flow: CaseFlow,
  committee: { name: string; memberIds: string[]; createdAt: string } | undefined,
  options: PackOptions,
  actor: { name: string; role: string },
  onStep?: (index: number, label: string) => Promise<void> | void,
): Promise<DefensibilityPack> {
  const a: AliasOptions = { redact: options.redact }
  const internals = internalOrderOf(committee?.memberIds ?? record.assignedIC)
  const member = (id: string) => aliasMember(id, a, internals)

  const step = async (i: number) => {
    await onStep?.(i, PACK_STEPS[i])
  }

  const sections: PackSection[] = []
  const withHash = async (s: Omit<PackSection, 'hash'>): Promise<PackSection> => ({
    ...s,
    hash: await hashOf({ id: s.id, title: s.title, rows: s.rows, prose: s.prose ?? [] }),
  })

  /* --- 1. Case identity --------------------------------------------- */
  await step(0)
  sections.push(
    await withHash({
      id: 'case',
      title: 'The case',
      blurb: 'Identity of the matter this pack concerns.',
      rows: [
        { label: 'Case number', value: record.id, mono: true },
        { label: 'Subject', value: record.summary },
        { label: 'Complainant', value: aliasParty(record.complainant, a) },
        { label: 'Respondent', value: aliasParty(record.respondent, a) },
        { label: 'Department', value: options.redact ? 'Withheld' : record.department },
        { label: 'Location', value: aliasPlace(record.location, a) },
        { label: 'Incident date', value: record.incidentDate, mono: true },
        { label: 'Date filed', value: record.filedDate, mono: true },
        { label: 'Priority', value: record.priority },
        { label: 'Current stage', value: STAGE_META[flow.stage].label },
        {
          label: 'Conciliation requested under s.10',
          value: yesNo(record.conciliationRequested),
        },
      ],
    }),
  )

  /* --- 2. Chronology ------------------------------------------------ */
  await step(1)
  sections.push(
    await withHash({
      id: 'chronology',
      title: 'Chronology',
      blurb: 'Every workflow transition on the record, in order, with actor and role.',
      rows: flow.history.map((h) => ({
        label: h.at.replace('T', ' ').slice(0, 16),
        value: `${STAGE_META[h.stage].label} — ${options.redact ? h.actorRole : `${h.actorName} (${h.actorRole})`} — ${h.remarks}`,
        mono: false,
      })),
    }),
  )

  /* --- 3. Compliance clocks ----------------------------------------- */
  await step(2)
  const milestones = milestonesFor(record.id)
  const clockRows: PackRow[] = milestones.map((m) => ({
    label: `${m.label} — ${m.provision}`,
    value: m.completedOn
      ? `Due ${m.dueOn} · met ${m.completedOn} · ${m.completedOn <= m.dueOn ? 'WITHIN the window' : 'OUTSIDE the window'}`
      : `Due ${m.dueOn} · not yet met · ${m.status}`,
    mono: true,
    emphasis: m.completedOn ? (m.completedOn <= m.dueOn ? 'met' : 'breach') : m.status === 'overdue' ? 'breach' : 'none',
  }))
  if (record.isBreached) {
    clockRows.push({
      label: 'Inquiry exceeded 90 days — s.11(4)',
      value: record.breachReason
        ? `Recorded reason: ${record.breachReason}`
        : 'NO REASON RECORDED. Rule 8(5) requires the reason to be recorded and reported.',
      emphasis: 'breach',
    })
  }
  sections.push(
    await withHash({
      id: 'clocks',
      title: 'Compliance clocks',
      blurb:
        'Each statutory deadline, the date it fell due, the date it was met, and whether it was met within the window.',
      rows: clockRows,
    }),
  )

  /* --- 4. Constitution of the committee ------------------------------ */
  await step(3)
  const memberIds = committee?.memberIds ?? record.assignedIC
  const constitution = constitutionTests(memberIds)
  sections.push(
    await withHash({
      id: 'constitution',
      title: 'Constitution of the Internal Committee',
      blurb: 'Composition of the board carrying this case, tested against s.4 as at the date of assignment.',
      rows: [
        { label: 'Board', value: committee?.name ?? 'Panel as recorded on the case' },
        { label: 'Constituted on', value: committee?.createdAt?.slice(0, 10) ?? '—', mono: true },
        ...memberIds.map((id) => {
          const u = userById(id)
          return {
            label: member(id),
            value: options.redact
              ? `${u?.role === 'external_member' ? 'External to the organisation' : 'Employed by the organisation'}`
              : `${u?.designation ?? ''} · ${maskValue(u?.email, a)}`,
          }
        }),
        { label: '— s.4 composition test —', value: allMet(constitution) ? 'PASSED' : 'FAILED', emphasis: allMet(constitution) ? 'met' : 'breach' },
        ...testRows(constitution),
        {
          label: 'Accepted the assignment',
          value: flow.acceptedBy.length ? flow.acceptedBy.map(member).join(', ') : 'None recorded',
        },
      ],
    }),
  )

  /* --- 5. Sittings --------------------------------------------------- */
  await step(4)
  const fixtureSittings = hearingsFor(record.id).map((h) => ({
    at: h.at,
    title: h.title,
    venue: h.location,
    attendees: h.attendeeIds,
    status: h.status as string,
    minutes: h.minutesRecorded ? 'Minutes recorded' : 'Minutes not recorded',
  }))
  const flowSittings = flow.hearings.map((h) => ({
    at: h.at,
    title: h.agenda,
    venue: h.location,
    attendees: memberIds,
    status: h.status as string,
    minutes: h.minutes ?? 'Minutes not recorded',
  }))
  const sittings = [...fixtureSittings, ...flowSittings].sort((x, y) => x.at.localeCompare(y.at))

  const sittingRows: PackRow[] = []
  for (const s of sittings) {
    const tests = sittingQuorumTests(s.attendees)
    sittingRows.push({
      label: s.at.replace('T', ' ').slice(0, 16),
      value: `${s.title} · ${aliasPlace(s.venue, a)} · ${s.status}`,
      mono: false,
    })
    sittingRows.push({
      label: '   In attendance',
      value: s.attendees.map(member).join(', ') || 'Not recorded',
    })
    sittingRows.push({
      label: '   Quorum',
      value: allMet(tests)
        ? 'MET — the sitting was properly constituted'
        : `NOT MET — ${tests.filter((t) => !t.met).map((t) => t.label).join('; ')}`,
      emphasis: allMet(tests) ? 'met' : 'breach',
    })
    sittingRows.push({ label: '   Minutes', value: redactProse(s.minutes, a) })
  }
  sections.push(
    await withHash({
      id: 'sittings',
      title: 'Sittings',
      blurb: 'Every sitting held, who attended, and the quorum test result for each.',
      rows: sittingRows.length ? sittingRows : [{ label: 'No sitting held', value: 'No hearing has been listed on this case.' }],
    }),
  )

  /* --- 6. Evidence index --------------------------------------------- */
  await step(5)
  const exhibits = evidenceForCase(record.id)
  const evidenceRows: PackRow[] = []
  for (const e of exhibits) {
    // The hash covers the item's identity and provenance, which is what a challenge
    // disputes. A real deployment would hash the file bytes; this fixture has no bytes.
    const h = await hashOf({
      exhibitNo: e.exhibitNo,
      type: e.type,
      description: e.description,
      receivedOn: e.receivedOn,
      submittedBy: e.submittedBy,
      custody: e.chainOfCustody.map((c) => ({ at: c.at, action: c.action, actor: c.actorId })),
    })
    evidenceRows.push({ label: e.exhibitNo, value: `${e.type} — ${e.description}`, mono: false })
    evidenceRows.push({
      label: '   Provenance',
      value: `Submitted by ${member(e.submittedBy)} on ${e.receivedOn} · status ${e.status} · ${e.chainOfCustody.length} custody events`,
    })
    evidenceRows.push({ label: '   SHA-256', value: h, mono: true })
  }
  for (const e of flow.evidence) {
    const h = await hashOf({ label: e.label, note: e.note, uploadedAt: e.uploadedAt, uploadedBy: e.uploadedBy })
    evidenceRows.push({ label: 'Filed, not yet admitted', value: e.label })
    evidenceRows.push({ label: '   Status', value: `${e.status} · filed ${e.uploadedAt.slice(0, 10)}` })
    evidenceRows.push({ label: '   SHA-256', value: h, mono: true })
  }
  sections.push(
    await withHash({
      id: 'evidence',
      title: 'Evidence index',
      blurb:
        'Every item on the record with its provenance, admission status and SHA-256 digest. A digest that still matches is an item that has not been altered since it was indexed.',
      rows: evidenceRows.length ? evidenceRows : [{ label: 'No evidence', value: 'No item has been filed on this case.' }],
    }),
  )

  /* --- 7. Documents index -------------------------------------------- */
  await step(6)
  const docs = documentsFor(record.id)
  const docRows: PackRow[] = []
  for (const d of docs) {
    const h = await hashOf({ name: d.name, version: d.version, uploadedAt: d.uploadedAt, sizeKb: d.sizeKb })
    docRows.push({ label: d.name, value: `${d.category} · ${d.version} · ${d.sizeKb} KB` })
    docRows.push({
      label: '   Filed',
      value: `${member(d.uploadedById)} on ${d.uploadedAt.slice(0, 10)} · access: ${d.access}`,
    })
    docRows.push({ label: '   SHA-256', value: h, mono: true })
  }
  sections.push(
    await withHash({
      id: 'documents',
      title: 'Documents index',
      blurb: 'Every document filed on the case, with its version, access class and digest.',
      rows: docRows.length ? docRows : [{ label: 'No document', value: 'No document has been filed on this case.' }],
    }),
  )

  /* --- 8. Recommendation --------------------------------------------- */
  await step(7)
  const recs = [...flow.recommendations].sort((x, y) => x.at.localeCompare(y.at))
  const current = recs[recs.length - 1]
  const recProse: Array<{ heading?: string; body: string }> = []
  if (current) {
    recProse.push({ heading: 'Current recommendation', body: redactProse(current.finding, a) })
    recProse.push({ heading: 'Action recommended', body: redactProse(current.recommendedAction, a) })
    recProse.push({ heading: 'Provision relied on', body: current.provision })
  }
  // Superseded versions appended in date order — the record of what changed is the part
  // a challenge is most interested in.
  for (const r of recs.slice(0, -1)) {
    recProse.push({
      heading: `Superseded — ${r.at.slice(0, 10)} (${r.status})`,
      body: `${redactProse(r.finding, a)}\n${r.reviewNote ? `Reviewer's observation: ${r.reviewNote}` : ''}`,
    })
  }
  sections.push(
    await withHash({
      id: 'recommendation',
      title: 'Recommendation',
      blurb: 'The committee’s findings, with every superseded version appended in date order.',
      rows: current
        ? [
            { label: 'Author', value: options.redact ? current.authorRole : `${current.author} (${current.authorRole})` },
            { label: 'Submitted', value: current.at.slice(0, 16).replace('T', ' '), mono: true },
            { label: 'Status', value: current.status },
            { label: 'Versions on record', value: String(recs.length) },
            ...(flow.finalDecision
              ? [
                  { label: 'Employer decision', value: flow.finalDecision.outcome },
                  { label: 'Action taken', value: redactProse(flow.finalDecision.action, a) },
                  { label: 'Recorded', value: flow.finalDecision.at.slice(0, 16).replace('T', ' '), mono: true },
                ]
              : [{ label: 'Employer decision', value: 'Not yet recorded' }]),
          ]
        : [{ label: 'No recommendation', value: 'The committee has not yet submitted findings.' }],
      prose: recProse,
    }),
  )

  /* --- 9. Access log -------------------------------------------------- */
  await step(8)
  const trail = auditForCase(record.id)
  sections.push(
    await withHash({
      id: 'access',
      title: 'Access log',
      blurb: options.includeAccessLog
        ? 'Every read and write against this case, by whom and when. Reads are included: under s.16 it is who *saw* the file that matters.'
        : 'Excluded at the request of the person generating this pack.',
      rows: options.includeAccessLog
        ? trail.map((e) => ({
            label: e.at.replace('T', ' ').slice(0, 19),
            value: `${e.action} · ${member(e.actorId)} · ${e.entity} · ${e.ip}`,
            mono: true,
          }))
        : [
            {
              label: 'Omitted',
              value: `${trail.length} access records exist on this case and were deliberately excluded from this pack. The count is stated so their absence cannot be mistaken for their non-existence.`,
            },
          ],
    }),
  )

  /* --- 10. Certificate ------------------------------------------------ */
  await step(9)
  const generatedAt = new Date().toISOString()
  const sectionHashes = sections.map((s) => s.hash)
  const root = await rootHash(sectionHashes)

  const certificate = await withHash({
    id: 'certificate',
    title: 'Certificate of completeness',
    blurb: 'What this pack contains, and the digest that commits to it.',
    rows: [
      { label: 'Case', value: record.id, mono: true },
      { label: 'Generated', value: generatedAt.replace('T', ' ').slice(0, 19), mono: true },
      { label: 'Generated by', value: `${actor.name} (${actor.role})` },
      { label: 'Prepared for', value: options.recipient || 'Not stated' },
      { label: 'Redaction', value: options.redact ? 'Redacted — identities replaced with role aliases' : 'Unredacted' },
      { label: 'Access log', value: options.includeAccessLog ? `Included — ${trail.length} records` : 'Excluded' },
      { label: 'Sections', value: String(sections.length + 1) },
      { label: 'Chronology entries', value: String(flow.history.length) },
      { label: 'Evidence items', value: String(exhibits.length + flow.evidence.length) },
      { label: 'Documents', value: String(docs.length) },
      { label: 'Sittings', value: String(sittings.length) },
      { label: 'Root SHA-256', value: root, mono: true },
      ...sections.map((s) => ({ label: `   ${s.title}`, value: s.hash, mono: true })),
    ],
    prose: [
      {
        body:
          'Each section above was hashed independently and the digests combined, in the order printed, into the root digest. Recomputing the digest of any section and comparing it to the value stated here will show whether that section has been altered since this pack was generated. A root that no longer matches means the pack changed; the section digests identify where.',
      },
    ],
  })
  sections.push(certificate)

  return {
    caseId: record.id,
    subject: record.summary,
    status: STAGE_META[flow.stage].label,
    generatedAt,
    generatedBy: actor.name,
    generatedByRole: actor.role,
    options,
    sections,
    rootHash: root,
    organisation: ORGANISATION.name,
  }
}

/** Days a case has been running, for the cover page. */
export const caseAgeDays = (record: Case) =>
  differenceInCalendarDays(new Date(), parseISO(record.filedDate))

export { sha256 }
