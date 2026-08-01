/**
 * The template library.
 *
 * The critique calls hand-typing every letter "the biggest real-world time sink in the
 * job", and it is right — but the reason to build this is not speed. It is that a notice
 * typed from memory is where the statutory windows get wrong. Rule 7(1) gives seven
 * working days for the notice and Rule 7(4) ten for the reply, and *working* days is the
 * part people miscount. Every date in these templates is computed by the same statutory
 * calculators the compliance clocks use, so a notice cannot state a deadline the case
 * record disagrees with.
 *
 * STANDING RULE 3 — no legal content is invented here. Every section reference and every
 * statement of a right already exists in the codebase: the provisions come from
 * `statutory.ts` and the rights language from the Help centre, which was itself written
 * against the Act. Where a template needs something a human must decide — the specific
 * allegation, the action directed — it is a merge field the sender fills, never text this
 * module makes up.
 */

import type { Case } from '../data/types'
import type { CaseFlow } from '../workflow/types'
import { formatDate } from '../format'
import { noticeDeadline, replyDeadline, dateNDaysAgo } from '../data/statutory'
import { ORGANISATION } from '../data/organisation'

export type Audience = 'Complainant' | 'Respondent' | 'Witness' | 'Employer' | 'Committee'

export interface TemplateField {
  id: string
  label: string
  /** Long-form fields render as a textarea. */
  long?: boolean
  placeholder?: string
  required?: boolean
  /** Prefilled from the case where one can be derived. */
  derive?: (ctx: MergeContext) => string
}

export interface MergeContext {
  record: Case
  flow: CaseFlow
  /** Alias-aware party names — the caller passes masked or real. */
  complainant: string
  respondent: string
  committee: string[]
  presidingOfficer: string
  sender: string
  senderRole: string
  values: Record<string, string>
}

export interface DocumentTemplate {
  id: string
  title: string
  audience: Audience
  /** One line on when this document is used. */
  purpose: string
  /** The provision it issues under. Drawn from the Act, never invented. */
  cite: string
  fields: TemplateField[]
  /** Returns the letter as titled blocks. */
  build: (ctx: MergeContext) => Array<{ heading?: string; body: string }>
}

const v = (ctx: MergeContext, id: string, fallback = '—') => ctx.values[id]?.trim() || fallback

/** Letterhead block every template opens with. */
const opening = (ctx: MergeContext, to: string) => [
  {
    body: `${ORGANISATION.name}\nInternal Committee constituted under Section 4, PoSH Act 2013\n\nCase number: ${ctx.record.id}\nDate: ${formatDate(dateNDaysAgo(0))}\n\nTo: ${to}`,
  },
]

const signature = (ctx: MergeContext) => ({
  body: `\n${ctx.presidingOfficer}\nPresiding Officer, Internal Committee\nFor and on behalf of the Committee\n\nThis communication is confidential. Disclosure of its contents is restricted by Section 16 of the Act.`,
})

export const TEMPLATES: DocumentTemplate[] = [
  /* ------------------------------------------------------------------ */
  {
    id: 'acknowledgement',
    title: 'Acknowledgement of complaint',
    audience: 'Complainant',
    purpose: 'Issued to the complainant on receipt, confirming the complaint is registered.',
    cite: 'Rule 7 · Section 9',
    fields: [
      {
        id: 'receivedOn',
        label: 'Complaint received on',
        derive: (c) => formatDate(c.record.filedDate),
        required: true,
      },
      { id: 'contact', label: 'Point of contact for questions', derive: (c) => c.presidingOfficer },
    ],
    build: (ctx) => [
      ...opening(ctx, ctx.complainant),
      {
        heading: 'Acknowledgement',
        body: `Your complaint received on ${v(ctx, 'receivedOn')} has been registered as ${ctx.record.id} and placed before the Internal Committee.`,
      },
      {
        heading: 'What happens next',
        body: `Notice will be served on the respondent within seven working days of the complaint, by ${formatDate(noticeDeadline(ctx.record.filedDate))}. The inquiry must be completed within ninety days of the complaint, by ${formatDate(ctx.record.milestones.inquiryDue)}. You will be given notice of any sitting you are required to attend.`,
      },
      {
        heading: 'Your position during the inquiry',
        body: `You may request interim relief under Section 12 at any time, including a change of reporting line or a no-contact directive. Adverse treatment because you have complained is itself misconduct under Section 19(g). If you wish to raise anything about the conduct of the inquiry, contact ${v(ctx, 'contact')}.`,
      },
      signature(ctx),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'notice-respondent',
    title: 'Notice to respondent',
    audience: 'Respondent',
    purpose: 'Served on the respondent with the statement of allegations. The reply window is computed.',
    cite: 'Rule 7(1) and 7(4)',
    fields: [
      {
        id: 'allegation',
        label: 'Statement of the allegation as put to the respondent',
        long: true,
        required: true,
        placeholder: 'The conduct alleged, in terms the respondent can answer.',
      },
      { id: 'servedOn', label: 'Date of service', derive: () => formatDate(dateNDaysAgo(0)), required: true },
    ],
    build: (ctx) => {
      const served = ctx.values.servedOn?.trim() ? dateNDaysAgo(0) : dateNDaysAgo(0)
      return [
        ...opening(ctx, ctx.respondent),
        {
          heading: 'Notice under Rule 7(1)',
          body: `A complaint has been made against you and registered as ${ctx.record.id}. This notice is served on you under Rule 7(1) together with the statement of allegations set out below.`,
        },
        { heading: 'Statement of allegations', body: v(ctx, 'allegation') },
        {
          heading: 'Your reply',
          body: `You are required to file a reply, with any supporting documents and the names of any witnesses, within ten working days of receiving this notice — by ${formatDate(replyDeadline(served))}. If no reply is received the Committee may proceed on the material before it.`,
        },
        {
          heading: 'Conduct during the inquiry',
          body: `You are entitled to be heard and to have the material relied on against you put to you. You may not approach the complainant or any witness about this matter. The proceedings are confidential under Section 16.`,
        },
        signature(ctx),
      ]
    },
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'notice-hearing',
    title: 'Notice of hearing',
    audience: 'Complainant',
    purpose: 'Issued to either party for a listed sitting, with date, time and venue.',
    cite: 'Section 11',
    fields: [
      { id: 'to', label: 'Addressed to', derive: (c) => c.complainant, required: true },
      {
        id: 'when',
        label: 'Date and time of the sitting',
        derive: (c) => {
          const next = c.flow.hearings.find((h) => h.status === 'Scheduled')
          return next ? `${formatDate(next.at.slice(0, 10))} at ${next.at.slice(11, 16)}` : ''
        },
        required: true,
      },
      {
        id: 'venue',
        label: 'Venue',
        derive: (c) => c.flow.hearings.find((h) => h.status === 'Scheduled')?.location ?? c.record.location,
        required: true,
      },
      { id: 'purposeOf', label: 'Purpose of the sitting', derive: () => 'Examination of the parties' },
    ],
    build: (ctx) => [
      ...opening(ctx, v(ctx, 'to')),
      {
        heading: 'Notice of hearing',
        body: `The Internal Committee will sit in ${ctx.record.id} on ${v(ctx, 'when')} at ${v(ctx, 'venue')}. The purpose of the sitting is ${v(ctx, 'purposeOf').toLowerCase()}.`,
      },
      {
        heading: 'Attendance',
        body: `You are requested to attend. You may bring a support person. If you would prefer not to be in the same room as the other party, tell the Committee before the sitting and separate or video attendance will be arranged. If you cannot attend, say so in advance and the Committee will consider adjourning.`,
      },
      signature(ctx),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'witness-summons',
    title: 'Witness summons',
    audience: 'Witness',
    purpose: 'Requires a witness to attend. The Committee has the powers of a civil court for this.',
    cite: 'Section 11(3)',
    fields: [
      { id: 'witness', label: 'Witness name', required: true },
      { id: 'when', label: 'Date and time of attendance', required: true },
      { id: 'venue', label: 'Venue', derive: (c) => c.record.location, required: true },
      { id: 'documents', label: 'Documents to bring, if any', long: true },
    ],
    build: (ctx) => [
      ...opening(ctx, v(ctx, 'witness')),
      {
        heading: 'Summons to attend',
        body: `You are required to attend before the Internal Committee in ${ctx.record.id} on ${v(ctx, 'when')} at ${v(ctx, 'venue')} to give evidence.`,
      },
      {
        heading: 'Authority',
        body: `Under Section 11(3) the Committee has the same powers as are vested in a civil court under the Code of Civil Procedure, 1908 in respect of summoning and enforcing the attendance of any person and examining them on oath, and requiring the discovery and production of documents.`,
      },
      ...(ctx.values.documents?.trim()
        ? [{ heading: 'Documents required', body: v(ctx, 'documents') }]
        : []),
      {
        heading: 'Confidentiality',
        body: `These proceedings are confidential. You may not disclose the contents of the complaint, the identity of any party or witness, or anything said before the Committee — Section 16.`,
      },
      signature(ctx),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'request-evidence',
    title: 'Request for further evidence',
    audience: 'Complainant',
    purpose: 'Asks a party for additional material, with a date by which it is needed.',
    cite: 'Section 11',
    fields: [
      { id: 'to', label: 'Addressed to', derive: (c) => c.complainant, required: true },
      { id: 'what', label: 'Material required', long: true, required: true },
      { id: 'by', label: 'Required by', derive: () => formatDate(dateNDaysAgo(-7)), required: true },
    ],
    build: (ctx) => [
      ...opening(ctx, v(ctx, 'to')),
      {
        heading: 'Request for further material',
        body: `In the course of its inquiry in ${ctx.record.id} the Committee requires the following:`,
      },
      { body: v(ctx, 'what') },
      {
        heading: 'By when',
        body: `Please provide this by ${v(ctx, 'by')}. If you cannot, tell the Committee why and it will consider the position. The ninety-day inquiry window under Section 11(4) continues to run, and closes on ${formatDate(ctx.record.milestones.inquiryDue)}.`,
      },
      signature(ctx),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'interim-relief',
    title: 'Interim relief recommendation',
    audience: 'Employer',
    purpose: 'Recommends interim measures to the employer while the inquiry runs.',
    cite: 'Section 12',
    fields: [
      { id: 'measure', label: 'Measure recommended', long: true, required: true },
      { id: 'duration', label: 'For how long', derive: () => 'Until the inquiry concludes' },
    ],
    build: (ctx) => [
      ...opening(ctx, 'The Employer'),
      {
        heading: 'Recommendation for interim relief',
        body: `In ${ctx.record.id}, and pending completion of the inquiry, the Internal Committee recommends the following under Section 12:`,
      },
      { body: v(ctx, 'measure') },
      {
        heading: 'Duration',
        body: `${v(ctx, 'duration')}. Interim relief is not a finding on the complaint and carries no implication as to the outcome.`,
      },
      signature(ctx),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'findings',
    title: 'Findings and recommendation',
    audience: 'Employer',
    purpose: 'The committee report to the employer at the conclusion of the inquiry.',
    cite: 'Section 13(1)',
    fields: [
      {
        id: 'finding',
        label: 'Finding',
        long: true,
        required: true,
        derive: (c) => c.flow.recommendations[c.flow.recommendations.length - 1]?.finding ?? '',
      },
      {
        id: 'action',
        label: 'Action recommended',
        long: true,
        required: true,
        derive: (c) => c.flow.recommendations[c.flow.recommendations.length - 1]?.recommendedAction ?? '',
      },
      {
        id: 'provision',
        label: 'Provision relied on',
        derive: (c) => c.flow.recommendations[c.flow.recommendations.length - 1]?.provision ?? '',
      },
    ],
    build: (ctx) => [
      ...opening(ctx, 'The Employer'),
      {
        heading: 'Report of the Internal Committee',
        body: `The Committee has completed its inquiry in ${ctx.record.id} and submits this report under Section 13(1), within ten days of the conclusion of the inquiry.`,
      },
      { heading: 'Finding', body: v(ctx, 'finding') },
      { heading: 'Action recommended', body: v(ctx, 'action') },
      { heading: 'Provision relied on', body: v(ctx, 'provision') },
      {
        heading: 'Constitution of the Committee',
        body: ctx.committee.join('\n'),
      },
      {
        heading: 'Employer action',
        body: `The employer is required to act on this recommendation within sixty days — Section 13(4). Either party may appeal within ninety days of the recommendation under Section 18.`,
      },
      signature(ctx),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'outcome-complainant',
    title: 'Outcome notification — complainant',
    audience: 'Complainant',
    purpose: 'Notifies the complainant of the outcome and their right of appeal.',
    cite: 'Section 13 · Section 18',
    fields: [
      {
        id: 'outcome',
        label: 'Outcome',
        derive: (c) => c.flow.finalDecision?.outcome ?? '',
        required: true,
      },
      {
        id: 'action',
        label: 'Action taken by the employer',
        long: true,
        derive: (c) => c.flow.finalDecision?.action ?? '',
      },
    ],
    build: (ctx) => [
      ...opening(ctx, ctx.complainant),
      {
        heading: 'Outcome of the inquiry',
        body: `The Internal Committee has completed its inquiry in ${ctx.record.id}. The finding is: ${v(ctx, 'outcome')}.`,
      },
      { heading: 'Action taken', body: v(ctx, 'action') },
      {
        heading: 'If you are not satisfied',
        body: `You may appeal within ninety days of the recommendation, under Section 18. Adverse treatment because you complained remains misconduct under Section 19(g) after the case is closed, and you should report it if it occurs.`,
      },
      {
        heading: 'Confidentiality',
        body: `The contents of this notification are confidential under Section 16.`,
      },
      signature(ctx),
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'outcome-respondent',
    title: 'Outcome notification — respondent',
    audience: 'Respondent',
    purpose: 'Notifies the respondent of the outcome and their right of appeal.',
    cite: 'Section 13 · Section 18',
    fields: [
      { id: 'outcome', label: 'Outcome', derive: (c) => c.flow.finalDecision?.outcome ?? '', required: true },
      {
        id: 'action',
        label: 'Action directed',
        long: true,
        derive: (c) => c.flow.finalDecision?.action ?? '',
      },
    ],
    build: (ctx) => [
      ...opening(ctx, ctx.respondent),
      {
        heading: 'Outcome of the inquiry',
        body: `The Internal Committee has completed its inquiry in ${ctx.record.id}. The finding is: ${v(ctx, 'outcome')}.`,
      },
      { heading: 'Action directed', body: v(ctx, 'action') },
      {
        heading: 'If you are not satisfied',
        body: `You may appeal within ninety days of the recommendation, under Section 18.`,
      },
      {
        heading: 'Confidentiality',
        body: `The contents of this notification are confidential under Section 16. You may not approach the complainant or any witness about this matter.`,
      },
      signature(ctx),
    ],
  },
]

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id)

/** Fills every field that can be derived from the case, leaving the rest for a human. */
export function deriveValues(template: DocumentTemplate, ctx: Omit<MergeContext, 'values'>): Record<string, string> {
  const withValues: MergeContext = { ...ctx, values: {} }
  return Object.fromEntries(
    template.fields.map((f) => [f.id, f.derive ? (f.derive(withValues) ?? '') : '']),
  )
}

/** Fields the sender still has to complete. */
export const missingRequired = (template: DocumentTemplate, values: Record<string, string>) =>
  template.fields.filter((f) => f.required && !values[f.id]?.trim())

/** The rendered letter as plain text, for the preview and the vault copy. */
export const renderPlain = (template: DocumentTemplate, ctx: MergeContext) =>
  template
    .build(ctx)
    .map((b) => (b.heading ? `${b.heading.toUpperCase()}\n\n${b.body}` : b.body))
    .join('\n\n')
