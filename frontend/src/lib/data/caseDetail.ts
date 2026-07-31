/**
 * Hearings, actions, communications and documents.
 *
 * The flagship case carries a full record; the rest of the caseload carries enough for
 * every list view to be populated. No screen in this product may show an empty state.
 */

import { CASES, FLAGSHIP_CASE_ID } from './cases'
import { dateNDaysAgo } from './statutory'
import {
  seedActions,
  seedCommunications,
  seedDocuments,
  seedHearings,
} from './caseWorkspaceSeed'
import type {
  ActionItem,
  Communication,
  DocumentRecord,
  Hearing,
  Milestone,
} from './types'

const at = (daysAgo: number, time: string) => `${dateNDaysAgo(daysAgo)}T${time}`

/* ------------------------------------------------------------------ *
 * Hearings
 * ------------------------------------------------------------------ */

export const HEARINGS: Hearing[] = [
  { id: 'HRG-0031', caseId: FLAGSHIP_CASE_ID, title: 'Preliminary sitting', type: 'Preliminary', status: 'Completed', at: at(72, '10:30'), durationMinutes: 60, location: 'Committee room, floor 3, Whitefield', attendeeIds: ['u-po', 'u-ic', 'u-ext'], minutesRecorded: true },
  { id: 'HRG-0032', caseId: FLAGSHIP_CASE_ID, title: 'Complainant deposition', type: 'Deposition', status: 'Completed', at: at(58, '11:00'), durationMinutes: 120, location: 'Committee room, floor 3, Whitefield', attendeeIds: ['u-po', 'u-ic', 'u-ext'], minutesRecorded: true },
  { id: 'HRG-0033', caseId: FLAGSHIP_CASE_ID, title: 'Respondent statement', type: 'Deposition', status: 'Completed', at: at(54, '15:30'), durationMinutes: 120, location: 'Committee room, floor 3, Whitefield', attendeeIds: ['u-po', 'u-ic'], minutesRecorded: true },
  { id: 'HRG-0034', caseId: FLAGSHIP_CASE_ID, title: 'Witness examination', type: 'Deposition', status: 'Completed', at: at(42, '10:20'), durationMinutes: 90, location: 'Virtual — secure bridge', attendeeIds: ['u-po', 'u-ext'], minutesRecorded: true },
  { id: 'HRG-0035', caseId: FLAGSHIP_CASE_ID, title: 'Cross examination of the respondent', type: 'Cross examination', status: 'Completed', at: at(28, '15:10'), durationMinutes: 120, location: 'Committee room, floor 3, Whitefield', attendeeIds: ['u-po', 'u-ic', 'u-ext', 'u-legal'], minutesRecorded: true },
  { id: 'HRG-0036', caseId: FLAGSHIP_CASE_ID, title: 'Deliberation sitting', type: 'Deliberation', status: 'Scheduled', at: at(-3, '11:00'), durationMinutes: 120, location: 'Committee room, floor 3, Whitefield', attendeeIds: ['u-po', 'u-ic', 'u-ext'], minutesRecorded: false },
  { id: 'HRG-0037', caseId: FLAGSHIP_CASE_ID, title: 'Final sitting — findings', type: 'Final', status: 'Scheduled', at: at(-5, '14:00'), durationMinutes: 180, location: 'Board room, floor 7, Whitefield', attendeeIds: ['u-po', 'u-ic', 'u-ext'], minutesRecorded: false },
  { id: 'HRG-0038', caseId: 'POSH-2026-0141', title: 'Closing submissions', type: 'Final', status: 'Scheduled', at: at(-2, '10:00'), durationMinutes: 120, location: 'Committee room, Nehru Place', attendeeIds: ['u-po', 'u-ic', 'u-ext'], minutesRecorded: false },
  { id: 'HRG-0039', caseId: 'POSH-2026-0144', title: 'Witness examination', type: 'Deposition', status: 'Scheduled', at: at(-6, '15:00'), durationMinutes: 90, location: 'Committee room, Andheri East', attendeeIds: ['u-po', 'u-ic'], minutesRecorded: false },
  { id: 'HRG-0040', caseId: 'POSH-2026-0139', title: 'Adjourned — quorum not met', type: 'Deliberation', status: 'Adjourned', at: at(30, '11:00'), durationMinutes: 0, location: 'Committee room, floor 3, Whitefield', attendeeIds: ['u-po', 'u-ic'], minutesRecorded: true },
  { id: 'HRG-0041', caseId: 'POSH-2026-0146', title: 'Complainant deposition', type: 'Deposition', status: 'Completed', at: at(20, '10:00'), durationMinutes: 90, location: 'Committee room, Hinjawadi', attendeeIds: ['u-po', 'u-ic', 'u-ext'], minutesRecorded: true },
  { id: 'HRG-0042', caseId: 'POSH-2026-0143', title: 'Preliminary sitting', type: 'Preliminary', status: 'Completed', at: at(48, '09:30'), durationMinutes: 60, location: 'Committee room, floor 3, Whitefield', attendeeIds: ['u-po', 'u-ic'], minutesRecorded: true },
]

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

export const DOCUMENTS: DocumentRecord[] = [
  { id: 'doc-01', caseId: FLAGSHIP_CASE_ID, name: 'Complaint_form_signed.pdf', description: 'Signed complaint form submitted through the employee portal', category: 'Complaint', access: 'Internal Committee', uploadedById: 'u-hr', uploadedAt: at(84, '11:20'), sizeKb: 245, version: 'v1' },
  { id: 'doc-02', caseId: FLAGSHIP_CASE_ID, name: 'Acknowledgement_letter.pdf', description: 'Acknowledgement issued to the complainant within 24 hours of filing', category: 'Communication', access: 'All members', uploadedById: 'u-hr', uploadedAt: at(83, '10:02'), sizeKb: 128, version: 'v1' },
  { id: 'doc-03', caseId: FLAGSHIP_CASE_ID, name: 'IC_constitution_order.pdf', description: 'Order constituting the Internal Committee for this case under s.4', category: 'Order', access: 'All members', uploadedById: 'u-admin', uploadedAt: at(82, '11:15'), sizeKb: 180, version: 'v1' },
  { id: 'doc-04', caseId: FLAGSHIP_CASE_ID, name: 'Notice_to_respondent.pdf', description: 'Notice served on the respondent within the Rule 7(1) window', category: 'Communication', access: 'Internal Committee', uploadedById: 'u-po', uploadedAt: at(79, '10:10'), sizeKb: 156, version: 'v1' },
  { id: 'doc-05', caseId: FLAGSHIP_CASE_ID, name: 'Interim_measure_order.pdf', description: 'No-contact directive recorded under s.12', category: 'Order', access: 'Internal Committee', uploadedById: 'u-po', uploadedAt: at(66, '10:00'), sizeKb: 142, version: 'v1' },
  { id: 'doc-06', caseId: FLAGSHIP_CASE_ID, name: 'Hearing_minutes_HRG0032.pdf', description: 'Signed minutes of the complainant deposition', category: 'Report', access: 'Internal Committee', uploadedById: 'u-po', uploadedAt: at(58, '16:40'), sizeKb: 318, version: 'v1' },
  { id: 'doc-07', caseId: FLAGSHIP_CASE_ID, name: 'Investigation_report_draft.docx', description: 'Working draft of the inquiry report — under panel review', category: 'Report', access: 'Administrators only', uploadedById: 'u-po', uploadedAt: at(3, '16:20'), sizeKb: 890, version: 'v3' },
  { id: 'doc-08', caseId: FLAGSHIP_CASE_ID, name: 'Conflict_declarations.pdf', description: 'Conflict of interest declarations from all committee members', category: 'Compliance', access: 'Administrators only', uploadedById: 'u-admin', uploadedAt: at(82, '12:00'), sizeKb: 95, version: 'v1' },
  { id: 'doc-08b', caseId: FLAGSHIP_CASE_ID, name: 'Hearing_bundle_index.pdf', description: 'Master index of exhibits and depositions for the deliberation sitting', category: 'Report', access: 'Internal Committee', uploadedById: 'u-ic', uploadedAt: at(5, '11:40'), sizeKb: 210, version: 'v2' },
  { id: 'doc-09', caseId: 'POSH-2026-0141', name: 'Closing_submissions.pdf', description: 'Written closing submissions from both parties', category: 'Report', access: 'Internal Committee', uploadedById: 'u-po', uploadedAt: at(9, '14:30'), sizeKb: 402, version: 'v1' },
  { id: 'doc-10', caseId: 'POSH-2026-0139', name: 'Delay_reason_record.pdf', description: 'Recorded reason for exceeding the 90-day inquiry window', category: 'Compliance', access: 'Administrators only', uploadedById: 'u-admin', uploadedAt: at(5, '09:00'), sizeKb: 88, version: 'v1' },
  { id: 'doc-11', caseId: 'POSH-2026-0146', name: 'Complaint_form_signed.pdf', description: 'Signed complaint form', category: 'Complaint', access: 'Internal Committee', uploadedById: 'u-hr', uploadedAt: at(34, '09:20'), sizeKb: 232, version: 'v1' },
  { id: 'doc-12', caseId: 'POSH-2026-0154', name: 'Inquiry_report_final.pdf', description: 'Final inquiry report submitted to the employer', category: 'Report', access: 'Legal and administrators', uploadedById: 'u-po', uploadedAt: at(4, '11:00'), sizeKb: 1120, version: 'v1' },
]

/* ------------------------------------------------------------------ *
 * Communications
 * ------------------------------------------------------------------ */

export const COMMUNICATIONS: Communication[] = [
  { id: 'com-01', caseId: FLAGSHIP_CASE_ID, channel: 'Portal notice', direction: 'Inbound', subject: 'Complaint submitted', template: 'Intake — employee portal receipt', counterpartyId: `${FLAGSHIP_CASE_ID}-complainant`, at: at(84, '09:12'), acknowledged: true, deliveryStatus: 'Acknowledged' },
  { id: 'com-02', caseId: FLAGSHIP_CASE_ID, channel: 'Email', direction: 'Outbound', subject: 'Acknowledgement of your complaint', template: 'TMPL-ACK-01 — Complaint acknowledgement', counterpartyId: `${FLAGSHIP_CASE_ID}-complainant`, at: at(83, '10:02'), acknowledged: true, deliveryStatus: 'Acknowledged' },
  { id: 'com-03', caseId: FLAGSHIP_CASE_ID, channel: 'Letter', direction: 'Outbound', subject: 'Notice under Rule 7(1) and statement of allegations', template: 'TMPL-NTR-01 — Notice to respondent', counterpartyId: `${FLAGSHIP_CASE_ID}-respondent`, at: at(79, '10:10'), acknowledged: true, deliveryStatus: 'Acknowledged' },
  { id: 'com-04', caseId: FLAGSHIP_CASE_ID, channel: 'Email', direction: 'Inbound', subject: 'Reply to notice under Rule 7(4)', template: 'Inbound — free-form reply', counterpartyId: `${FLAGSHIP_CASE_ID}-respondent`, at: at(61, '09:45'), acknowledged: true, deliveryStatus: 'Delivered' },
  { id: 'com-05', caseId: FLAGSHIP_CASE_ID, channel: 'Letter', direction: 'Outbound', subject: 'Interim measure — no-contact directive', template: 'TMPL-INT-12 — Interim relief under s.12', counterpartyId: `${FLAGSHIP_CASE_ID}-respondent`, at: at(66, '10:00'), acknowledged: true, deliveryStatus: 'Acknowledged' },
  { id: 'com-06', caseId: FLAGSHIP_CASE_ID, channel: 'Email', direction: 'Outbound', subject: 'Notice of deposition — 58 days from filing', template: 'TMPL-HRG-02 — Hearing notice', counterpartyId: `${FLAGSHIP_CASE_ID}-complainant`, at: at(60, '14:00'), acknowledged: true, deliveryStatus: 'Acknowledged' },
  { id: 'com-07', caseId: FLAGSHIP_CASE_ID, channel: 'Email', direction: 'Outbound', subject: 'Notice of cross examination', template: 'TMPL-HRG-02 — Hearing notice', counterpartyId: `${FLAGSHIP_CASE_ID}-respondent`, at: at(31, '09:00'), acknowledged: true, deliveryStatus: 'Acknowledged' },
  { id: 'com-08', caseId: FLAGSHIP_CASE_ID, channel: 'In person', direction: 'Inbound', subject: 'Request for support person at hearings', template: 'Inbound — oral request logged', counterpartyId: `${FLAGSHIP_CASE_ID}-complainant`, at: at(57, '10:00'), acknowledged: true, deliveryStatus: 'Delivered' },
  { id: 'com-09', caseId: FLAGSHIP_CASE_ID, channel: 'Portal notice', direction: 'Outbound', subject: 'Deliberation sitting scheduled', template: 'TMPL-HRG-04 — Deliberation notice', counterpartyId: `${FLAGSHIP_CASE_ID}-complainant`, at: at(6, '11:45'), acknowledged: false, deliveryStatus: 'Pending' },
  { id: 'com-10', caseId: 'POSH-2026-0141', channel: 'Letter', direction: 'Outbound', subject: 'Notice of closing submissions', template: 'TMPL-HRG-05 — Closing submissions', counterpartyId: 'POSH-2026-0141-respondent', at: at(10, '10:00'), acknowledged: true, deliveryStatus: 'Acknowledged' },
  { id: 'com-11', caseId: 'POSH-2026-0149', channel: 'Letter', direction: 'Outbound', subject: 'Notice under Rule 7(1)', template: 'TMPL-NTR-01 — Notice to respondent', counterpartyId: 'POSH-2026-0149-respondent', at: at(10, '09:30'), acknowledged: false, deliveryStatus: 'Pending' },
  { id: 'com-12', caseId: 'POSH-2026-0139', channel: 'Email', direction: 'Outbound', subject: 'Recorded reason for delay under Rule 8(5)', template: 'TMPL-DLY-01 — Delay disclosure', counterpartyId: 'POSH-2026-0139-complainant', at: at(5, '09:10'), acknowledged: true, deliveryStatus: 'Acknowledged' },
]

/* ------------------------------------------------------------------ *
 * Action items
 * ------------------------------------------------------------------ */

export const ACTIONS: ActionItem[] = [
  { id: 'act-01', caseId: FLAGSHIP_CASE_ID, title: 'Finalise inquiry report for the employer', ownerId: 'u-po', dueOn: dateNDaysAgo(-6), priority: 'High', status: 'In progress' },
  { id: 'act-02', caseId: FLAGSHIP_CASE_ID, title: 'Obtain External Member sign-off on findings', ownerId: 'u-ext', dueOn: dateNDaysAgo(-4), priority: 'High', status: 'In progress' },
  { id: 'act-03', caseId: FLAGSHIP_CASE_ID, title: 'Circulate deliberation agenda to the panel', ownerId: 'u-ic', dueOn: dateNDaysAgo(-2), priority: 'Medium', status: 'To do' },
  { id: 'act-01b', caseId: FLAGSHIP_CASE_ID, title: 'Upload signed witness attendance sheets for HRG-0034', ownerId: 'u-ic', dueOn: dateNDaysAgo(3), priority: 'High', status: 'Overdue' },
  { id: 'act-01c', caseId: FLAGSHIP_CASE_ID, title: 'Confirm interim no-contact compliance with facilities', ownerId: 'u-hr', dueOn: dateNDaysAgo(1), priority: 'Medium', status: 'Overdue' },
  { id: 'act-04', caseId: 'POSH-2026-0139', title: 'File Rule 8(5) delay disclosure with the District Officer', ownerId: 'u-admin', dueOn: dateNDaysAgo(2), priority: 'High', status: 'Overdue' },
  { id: 'act-05', caseId: 'POSH-2026-0141', title: 'Record closing submissions', ownerId: 'u-po', dueOn: dateNDaysAgo(-2), priority: 'High', status: 'To do' },
  { id: 'act-06', caseId: 'POSH-2026-0149', title: 'Follow up on respondent reply', ownerId: 'u-hr', dueOn: dateNDaysAgo(-1), priority: 'High', status: 'To do' },
  { id: 'act-07', caseId: 'POSH-2026-0148', title: 'Serve reminder notice under Rule 7(4)', ownerId: 'u-hr', dueOn: dateNDaysAgo(1), priority: 'Medium', status: 'Overdue' },
  { id: 'act-08', caseId: 'POSH-2026-0146', title: 'Schedule respondent deposition', ownerId: 'u-po', dueOn: dateNDaysAgo(-8), priority: 'Medium', status: 'To do' },
  { id: 'act-09', caseId: 'POSH-2026-0154', title: 'Submit report to the employer within s.13(1)', ownerId: 'u-po', dueOn: dateNDaysAgo(-3), priority: 'High', status: 'In progress' },
  { id: 'act-10', caseId: 'POSH-2026-0152', title: 'Record employer action under s.13(4)', ownerId: 'u-admin', dueOn: dateNDaysAgo(-18), priority: 'Medium', status: 'To do' },
  { id: 'act-11', caseId: 'POSH-2026-0158', title: 'Serve notice on the respondent', ownerId: 'u-hr', dueOn: dateNDaysAgo(-4), priority: 'High', status: 'In progress' },
  { id: 'act-12', caseId: 'POSH-2026-0145', title: 'Arrange support person for the next sitting', ownerId: 'u-ic', dueOn: dateNDaysAgo(-9), priority: 'Low', status: 'To do' },
  { id: 'act-13', caseId: 'POSH-2026-0138', title: 'Confirm compliance with the reassignment direction', ownerId: 'u-hr', dueOn: dateNDaysAgo(40), priority: 'Low', status: 'Done' },
  { id: 'act-14', caseId: 'POSH-2026-0136', title: 'Archive case file under retention policy', ownerId: 'u-admin', dueOn: dateNDaysAgo(60), priority: 'Low', status: 'Done' },
]

/* ------------------------------------------------------------------ *
 * Milestones, derived from the statutory clocks on each case
 * ------------------------------------------------------------------ */

export function milestonesFor(caseId: string): Milestone[] {
  const c = CASES.find((x) => x.id === caseId)
  if (!c) return []
  const m = c.milestones

  const rows: Array<[string, string, string, string | null]> = [
    ['Notice served on respondent', 'Rule 7(1) — 7 working days', m.noticeDue, m.noticeServedOn],
    ['Respondent reply received', 'Rule 7(4) — 10 working days', m.replyDue, m.replyReceivedOn],
    ['Inquiry completed', 'Section 11(4) — 90 days', m.inquiryDue, m.inquiryCompletedOn],
  ]
  if (m.reportDue) rows.push(['Report to employer', 'Section 13(1) — 10 days', m.reportDue, m.reportSubmittedOn])
  if (m.actionDue) rows.push(['Employer action taken', 'Section 13(4) — 60 days', m.actionDue, m.actionTakenOn])
  if (m.appealWindowEnds) rows.push(['Appeal window closes', 'Section 18(1) — 90 days', m.appealWindowEnds, null])

  const today = dateNDaysAgo(0)

  return rows.map(([label, provision, dueOn, completedOn], i) => ({
    id: `${caseId}-ms-${i + 1}`,
    caseId,
    label,
    provision,
    dueOn,
    completedOn,
    status: completedOn
      ? 'complete'
      : dueOn < today
        ? 'overdue'
        : dueOn <= dateNDaysAgo(-14)
          ? 'due'
          : 'upcoming',
  }))
}

export const hearingsFor = (caseId: string) => {
  const rows = HEARINGS.filter((h) => h.caseId === caseId)
  return rows.length ? rows : seedHearings(caseId)
}
export const documentsFor = (caseId: string) => {
  const rows = DOCUMENTS.filter((d) => d.caseId === caseId)
  return rows.length ? rows : seedDocuments(caseId)
}
export const communicationsFor = (caseId: string) => {
  const rows = COMMUNICATIONS.filter((c) => c.caseId === caseId)
  return rows.length ? rows : seedCommunications(caseId)
}
export const actionsFor = (caseId: string) => {
  const rows = ACTIONS.filter((a) => a.caseId === caseId)
  return rows.length ? rows : seedActions(caseId)
}
