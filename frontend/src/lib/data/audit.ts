/**
 * Dual audit trail — PoSH (case confidentiality) + Technical (platform security).
 *
 * Flagship POSH-2026-0142 carries 60+ authored rows with heavy VIEW coverage.
 * Remaining caseload is seeded so every case workspace Timeline has content.
 * Platform-wide technical events pad the /audit screen to ~247 entries.
 */

import { CASES, FLAGSHIP_CASE_ID } from './cases'
import { dateNDaysAgo } from './statutory'
import { seedAudit } from './caseWorkspaceSeed'
import type { AuditAction, AuditEntry, AuditKind } from './types'

const IP: Record<string, string> = {
  'u-emp': '10.24.6.118',
  'u-hr': '10.24.1.42',
  'u-po': '10.31.2.11',
  'u-ic': '10.28.4.77',
  'u-ext': '203.0.113.24',
  'u-legal': '10.19.8.55',
  'u-mgmt': '10.12.3.9',
  'u-admin': '10.24.1.7',
  system: '—',
}

/** [daysAgo, HH:mm:ss, actorId, action, entity, detail, kind] */
type Row = [number, string, string, AuditAction, string, string, AuditKind]

const FLAGSHIP: Row[] = [
  [84, '09:12:03', 'u-emp', 'CREATE', 'Case POSH-2026-0142', 'Complaint registered through the employee portal.', 'posh'],
  [84, '09:14:11', 'system', 'CREATE', 'Milestone: notice due · POSH-2026-0142', 'Rule 7(1) clock started — 7 working days.', 'technical'],
  [84, '09:15:02', 'system', 'CREATE', 'Milestone: inquiry due · POSH-2026-0142', 'Section 11(4) clock started — 90 days.', 'technical'],
  [84, '09:41:44', 'u-hr', 'VIEW', 'Case POSH-2026-0142', 'Intake triage opened.', 'posh'],
  [84, '10:05:18', 'u-hr', 'CREATE', 'Evidence E-01 · POSH-2026-0142', 'Email thread received from the complainant.', 'posh'],
  [84, '10:40:09', 'u-hr', 'UPDATE', 'Evidence E-01 · POSH-2026-0142', 'Exhibit sealed; SHA-256 recorded.', 'posh'],
  [84, '11:20:33', 'u-hr', 'CREATE', 'Document: Complaint_form_signed.pdf · POSH-2026-0142', 'Signed complaint form filed.', 'posh'],
  [83, '09:30:12', 'u-hr', 'VIEW', 'Document: Complaint_form_signed.pdf · POSH-2026-0142', 'Reviewed before acknowledgement.', 'posh'],
  [83, '10:02:55', 'u-hr', 'CREATE', 'Communication: acknowledgement · POSH-2026-0142', 'Acknowledgement issued to the complainant.', 'posh'],
  [83, '14:50:01', 'u-admin', 'STAGE_CHANGE', 'Case POSH-2026-0142', 'Stage moved from Registered to Notice served.', 'posh'],
  [82, '11:15:40', 'u-admin', 'CREATE', 'Order: IC constitution · POSH-2026-0142', 'Committee constituted under s.4.', 'posh'],
  [82, '11:30:22', 'u-po', 'VIEW', 'Case POSH-2026-0142', 'Assigned as Presiding Officer.', 'posh'],
  [82, '12:05:08', 'u-po', 'VIEW', 'Document: IC_constitution_order.pdf · POSH-2026-0142', 'Verified committee constitution.', 'posh'],
  [80, '09:30:17', 'u-hr', 'CREATE', 'Evidence E-02 · POSH-2026-0142', 'Message log export received under preservation request.', 'posh'],
  [80, '09:55:41', 'u-hr', 'UPDATE', 'Evidence E-02 · POSH-2026-0142', 'Exhibit sealed unmodified; manifest attached.', 'posh'],
  [80, '15:22:03', 'u-ic', 'VIEW', 'Case POSH-2026-0142', 'Panel briefing.', 'posh'],
  [80, '15:40:19', 'u-ic', 'VIEW', 'Evidence E-01 · POSH-2026-0142', 'Reviewed email thread ahead of sitting.', 'posh'],
  [79, '10:10:00', 'u-po', 'CREATE', 'Communication: notice to respondent · POSH-2026-0142', 'Notice served within Rule 7(1) window.', 'posh'],
  [79, '10:12:14', 'system', 'CREATE', 'Milestone: reply due · POSH-2026-0142', 'Rule 7(4) clock started — 10 working days.', 'technical'],
  [78, '09:05:33', 'u-emp', 'VIEW', 'Case POSH-2026-0142', 'Complainant checked case status.', 'posh'],
  [76, '14:20:11', 'u-po', 'VIEW', 'Evidence E-01 · POSH-2026-0142', 'Reviewed for admissibility at preliminary sitting.', 'posh'],
  [76, '14:35:48', 'u-po', 'VIEW', 'Evidence E-02 · POSH-2026-0142', 'Cross-checked messaging export.', 'posh'],
  [76, '15:00:02', 'u-po', 'CREATE', 'Hearing HRG-0031 · POSH-2026-0142', 'Preliminary sitting scheduled.', 'posh'],
  [74, '11:00:27', 'u-hr', 'CREATE', 'Evidence E-05 · POSH-2026-0142', 'Policy version 3.2 produced with acknowledgement record.', 'posh'],
  [74, '11:20:09', 'u-hr', 'UPDATE', 'Evidence E-05 · POSH-2026-0142', 'Sealed as a reference exhibit.', 'posh'],
  [74, '16:10:44', 'u-po', 'VIEW', 'Document: Conflict_declarations.pdf · POSH-2026-0142', 'Confirmed conflict declarations filed.', 'posh'],
  [72, '10:30:00', 'u-po', 'UPDATE', 'Hearing HRG-0031 · POSH-2026-0142', 'Minutes recorded and circulated to the panel.', 'posh'],
  [72, '11:05:18', 'u-ext', 'VIEW', 'Hearing HRG-0031 · POSH-2026-0142', 'External Member reviewed minutes.', 'posh'],
  [71, '16:40:55', 'u-mgmt', 'ACCESS_DENIED', 'Party identities · POSH-2026-0142', 'Management attempted party detail; identities withheld under s.16.', 'technical'],
  [70, '15:10:22', 'u-po', 'VIEW', 'Evidence E-02 · POSH-2026-0142', 'Reviewed against the complaint narrative.', 'posh'],
  [69, '09:20:07', 'u-ext', 'VIEW', 'Case POSH-2026-0142', 'External Member joined the panel.', 'posh'],
  [68, '11:45:31', 'u-ic', 'VIEW', 'Document: Complaint_form_signed.pdf · POSH-2026-0142', 'Panel review.', 'posh'],
  [66, '10:00:00', 'u-po', 'CREATE', 'Communication: interim measure · POSH-2026-0142', 'No-contact directive recorded under s.12.', 'posh'],
  [66, '10:22:14', 'u-hr', 'VIEW', 'Document: Interim_measure_order.pdf · POSH-2026-0142', 'Facilities coordination review.', 'posh'],
  [64, '16:45:03', 'u-po', 'CREATE', 'Evidence E-07 · POSH-2026-0142', 'Occupational health assessment received in sealed cover.', 'posh'],
  [64, '17:00:41', 'u-po', 'UPDATE', 'Evidence E-07 · POSH-2026-0142', 'Access restricted to PO and External Member.', 'posh'],
  [63, '10:35:19', 'u-emp', 'VIEW', 'Case POSH-2026-0142', 'Complainant checked case status.', 'posh'],
  [61, '09:45:00', 'u-po', 'UPDATE', 'Case POSH-2026-0142', "Respondent's reply received and recorded.", 'posh'],
  [61, '09:50:28', 'u-admin', 'STAGE_CHANGE', 'Case POSH-2026-0142', 'Stage moved from Awaiting reply to In inquiry.', 'posh'],
  [60, '14:15:44', 'u-ic', 'VIEW', 'Evidence E-01 · POSH-2026-0142', 'Preparation for depositions.', 'posh'],
  [60, '14:40:02', 'u-ic', 'VIEW', 'Document: Notice_to_respondent.pdf · POSH-2026-0142', 'Verified notice content before deposition.', 'posh'],
  [58, '11:15:09', 'u-ic', 'VIEW', 'Evidence E-01 · POSH-2026-0142', 'Referenced during complainant deposition.', 'posh'],
  [58, '11:20:00', 'u-po', 'CREATE', 'Hearing HRG-0032 · POSH-2026-0142', 'Complainant deposition recorded.', 'posh'],
  [58, '16:40:33', 'u-po', 'CREATE', 'Document: Hearing_minutes_HRG0032.pdf · POSH-2026-0142', 'Signed minutes filed.', 'posh'],
  [58, '17:05:11', 'u-ext', 'VIEW', 'Document: Hearing_minutes_HRG0032.pdf · POSH-2026-0142', 'External Member reviewed minutes.', 'posh'],
  [56, '10:05:48', 'u-ext', 'VIEW', 'Document: IC_constitution_order.pdf · POSH-2026-0142', 'Verified quorum under s.4(3).', 'posh'],
  [54, '15:30:00', 'u-po', 'CREATE', 'Hearing HRG-0033 · POSH-2026-0142', 'Respondent statement recorded.', 'posh'],
  [54, '16:10:22', 'u-ic', 'VIEW', 'Hearing HRG-0033 · POSH-2026-0142', 'Reviewed respondent statement notes.', 'posh'],
  [52, '12:00:07', 'u-admin', 'CREATE', 'Evidence E-04 · POSH-2026-0142', 'Building access records extracted under documented request.', 'posh'],
  [52, '12:30:41', 'u-admin', 'UPDATE', 'Evidence E-04 · POSH-2026-0142', 'Sealed with extraction query recorded.', 'posh'],
  [50, '10:15:18', 'u-ext', 'VIEW', 'Evidence E-07 · POSH-2026-0142', 'Reviewed in support of interim relief request.', 'posh'],
  [48, '09:00:55', 'u-legal', 'VIEW', 'Case POSH-2026-0142', 'Legal review of procedural compliance.', 'posh'],
  [48, '09:25:12', 'u-legal', 'VIEW', 'Document: Interim_measure_order.pdf · POSH-2026-0142', 'Reviewed s.12 directive.', 'posh'],
  [46, '15:40:00', 'u-po', 'CREATE', 'Evidence E-03 · POSH-2026-0142', 'Witness statement recorded and signed.', 'posh'],
  [46, '16:10:33', 'u-po', 'UPDATE', 'Evidence E-03 · POSH-2026-0142', 'Sealed with witness declaration.', 'posh'],
  [44, '11:30:08', 'u-ic', 'VIEW', 'Evidence E-03 · POSH-2026-0142', 'Panel review of witness account.', 'posh'],
  [42, '10:20:00', 'u-po', 'CREATE', 'Hearing HRG-0034 · POSH-2026-0142', 'Witness examination completed.', 'posh'],
  [40, '09:45:19', 'u-po', 'VIEW', 'Evidence E-04 · POSH-2026-0142', 'Cross-checked against complaint timeline.', 'posh'],
  [38, '13:15:02', 'u-hr', 'CREATE', 'Evidence E-06 · POSH-2026-0142', 'Appraisal history produced to test retaliation allegation.', 'posh'],
  [38, '13:35:44', 'u-hr', 'UPDATE', 'Evidence E-06 · POSH-2026-0142', 'Sealed; access restricted to the committee.', 'posh'],
  [36, '16:00:11', 'u-mgmt', 'VIEW', 'Aggregate statistics', 'Anonymised management dashboard opened.', 'technical'],
  [34, '10:05:27', 'u-ic', 'DOWNLOAD', 'Evidence E-02 · POSH-2026-0142', 'Redacted extract prepared for respondent under Rule 7(4).', 'posh'],
  [34, '10:18:03', 'u-ic', 'SHARE', 'Evidence E-02 · POSH-2026-0142', 'Redacted extract shared with respondent counsel channel.', 'posh'],
  [32, '14:40:55', 'u-ext', 'VIEW', 'Case POSH-2026-0142', 'Preparation for cross examination.', 'posh'],
  [32, '15:05:12', 'u-ext', 'VIEW', 'Evidence E-04 · POSH-2026-0142', 'Reviewed access log exhibit.', 'posh'],
  [30, '11:25:40', 'u-ext', 'VIEW', 'Evidence E-03 · POSH-2026-0142', 'Reviewed for corroboration.', 'posh'],
  [28, '15:10:00', 'u-po', 'CREATE', 'Hearing HRG-0035 · POSH-2026-0142', 'Cross examination of the respondent.', 'posh'],
  [28, '17:20:18', 'u-legal', 'VIEW', 'Hearing HRG-0035 · POSH-2026-0142', 'Observed cross examination for procedural compliance.', 'posh'],
  [26, '14:05:33', 'u-legal', 'VIEW', 'Evidence E-05 · POSH-2026-0142', 'Reviewed policy standard applicable at the incident.', 'posh'],
  [24, '10:50:09', 'u-po', 'VIEW', 'Evidence E-06 · POSH-2026-0142', 'Compared against timeline of the refusal.', 'posh'],
  [22, '16:30:44', 'u-ext', 'VIEW', 'Evidence E-01 · POSH-2026-0142', 'Reviewed ahead of closing submissions.', 'posh'],
  [22, '16:55:01', 'u-ext', 'DOWNLOAD', 'Evidence E-01 · POSH-2026-0142', 'Downloaded for External Member binder.', 'posh'],
  [20, '09:15:22', 'u-emp', 'VIEW', 'Case POSH-2026-0142', 'Complainant checked case status.', 'posh'],
  [18, '17:00:00', 'u-admin', 'UPDATE', 'Evidence E-04 · POSH-2026-0142', 'Released back to facilities; retention no longer required.', 'posh'],
  [16, '11:00:37', 'u-po', 'CREATE', 'Document: Investigation_report_draft.docx · POSH-2026-0142', 'First draft of the inquiry report.', 'posh'],
  [14, '10:30:15', 'u-ic', 'VIEW', 'Document: Investigation_report_draft.docx · POSH-2026-0142', 'Panel review of the draft.', 'posh'],
  [14, '11:05:48', 'u-ic', 'VIEW', 'Evidence E-06 · POSH-2026-0142', 'Cross-checked appraisal exhibit against draft findings.', 'posh'],
  [12, '15:20:03', 'u-ext', 'VIEW', 'Evidence E-06 · POSH-2026-0142', 'Reviewed ahead of deliberation sitting.', 'posh'],
  [12, '15:45:29', 'u-ext', 'VIEW', 'Document: Hearing_bundle_index.pdf · POSH-2026-0142', 'Reviewed exhibit index.', 'posh'],
  [10, '09:40:11', 'u-legal', 'VIEW', 'Document: Investigation_report_draft.docx · POSH-2026-0142', 'Legal review of draft findings.', 'posh'],
  [9, '14:00:55', 'u-hr', 'ACCESS_DENIED', 'Inquiry findings · POSH-2026-0142', 'HR SPOC attempted inquiry content; role limited to intake.', 'technical'],
  [8, '09:00:00', 'u-po', 'UPDATE', 'Evidence E-07 · POSH-2026-0142', 'Returned to sealed archive after interim order recorded.', 'posh'],
  [6, '11:45:22', 'u-po', 'CREATE', 'Hearing HRG-0036 · POSH-2026-0142', 'Deliberation sitting scheduled.', 'posh'],
  [5, '11:40:08', 'u-ic', 'CREATE', 'Document: Hearing_bundle_index.pdf · POSH-2026-0142', 'Master exhibit index filed for deliberation.', 'posh'],
  [5, '12:10:44', 'u-po', 'VIEW', 'Document: Hearing_bundle_index.pdf · POSH-2026-0142', 'Presiding Officer reviewed bundle index.', 'posh'],
  [4, '10:15:19', 'u-admin', 'EXPORT', 'Case POSH-2026-0142', 'Statutory compliance extract for quarterly return.', 'technical'],
  [3, '16:20:00', 'u-po', 'UPDATE', 'Document: Investigation_report_draft.docx · POSH-2026-0142', 'Third draft circulated to the panel.', 'posh'],
  [3, '16:45:33', 'u-ic', 'VIEW', 'Document: Investigation_report_draft.docx · POSH-2026-0142', 'Reviewed v3 draft.', 'posh'],
  [2, '09:30:12', 'u-mgmt', 'VIEW', 'Aggregate statistics', 'Anonymised management dashboard opened.', 'technical'],
  [2, '14:05:47', 'u-po', 'VIEW', 'Evidence E-03 · POSH-2026-0142', 'Revisited witness statement before deliberation.', 'posh'],
  [1, '11:10:05', 'u-ext', 'VIEW', 'Document: Investigation_report_draft.docx · POSH-2026-0142', 'External Member review before sign-off.', 'posh'],
  [1, '11:40:28', 'u-ext', 'VIEW', 'Evidence E-04 · POSH-2026-0142', 'Final proximity check on access logs.', 'posh'],
  [0, '08:45:00', 'system', 'UPDATE', 'Milestone: inquiry due · POSH-2026-0142', 'Day 84 of 90 — six days remain in the s.11(4) window.', 'technical'],
  [0, '09:12:41', 'u-admin', 'LOGIN', 'Platform session', 'Administrator signed in from Bengaluru office.', 'technical'],
  [0, '10:05:19', 'u-po', 'VIEW', 'Case POSH-2026-0142', 'Opened workspace to prepare deliberation agenda.', 'posh'],
  [0, '10:22:07', 'u-po', 'VIEW', 'Evidence E-01 · POSH-2026-0142', 'Re-read primary email exhibit.', 'posh'],
  [0, '10:35:54', 'u-po', 'VIEW', 'Evidence E-02 · POSH-2026-0142', 'Re-read messaging export.', 'posh'],
]

function expandTechnicalPadding(): Row[] {
  const actors = ['u-admin', 'u-hr', 'u-po', 'u-ic', 'u-legal', 'u-mgmt', 'u-ext'] as const
  const rows: Row[] = []
  for (let d = 0; d < 90; d += 1) {
    const actor = actors[d % actors.length]
    const minute = String(10 + (d % 40)).padStart(2, '0')
    const sec = String((d * 7) % 60).padStart(2, '0')
    if (d % 3 === 0) {
      rows.push([d, `08:${minute}:${sec}`, actor, 'LOGIN', 'Platform session', `${actor} authenticated via MFA.`, 'technical'])
    } else if (d % 3 === 1) {
      rows.push([d, `12:${minute}:${sec}`, 'u-mgmt', 'VIEW', 'Aggregate statistics', 'Anonymised compliance dashboard opened.', 'technical'])
    } else {
      rows.push([d, `18:${minute}:${sec}`, 'u-admin', 'EXPORT', 'System backup snapshot', 'Encrypted nightly export completed.', 'technical'])
    }
  }
  // A few ACCESS_DENIED / DELETE flavour rows
  rows.push([7, '15:22:11', 'u-mgmt', 'ACCESS_DENIED', 'Evidence vault', 'Management blocked from evidence store.', 'technical'])
  rows.push([11, '09:18:44', 'u-hr', 'ACCESS_DENIED', 'Inquiry findings', 'HR SPOC blocked from inquiry content.', 'technical'])
  rows.push([21, '16:40:02', 'u-emp', 'ACCESS_DENIED', 'Other cases list', 'Employee restricted to own case.', 'technical'])
  rows.push([33, '11:05:30', 'u-admin', 'DELETE', 'Draft export job', 'Cancelled incomplete export job (no case data destroyed).', 'technical'])
  return rows
}

function toEntries(rows: Row[], caseId: string, prefix: string): AuditEntry[] {
  return rows.map(([daysAgo, time, actorId, action, entity, detail, kind], i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    caseId,
    at: `${dateNDaysAgo(daysAgo)}T${time}`,
    actorId,
    action,
    entity,
    ip: IP[actorId] ?? '—',
    detail,
    kind,
  }))
}

const FLAGSHIP_ENTRIES = toEntries(FLAGSHIP, FLAGSHIP_CASE_ID, 'au-f')
const TECHNICAL_PAD = toEntries(expandTechnicalPadding(), 'SYSTEM', 'au-t')

const OTHER_CASE_ENTRIES: AuditEntry[] = CASES.filter((c) => c.id !== FLAGSHIP_CASE_ID).flatMap((c) =>
  seedAudit(c.id),
)

export const AUDIT_LOG: AuditEntry[] = [...FLAGSHIP_ENTRIES, ...OTHER_CASE_ENTRIES, ...TECHNICAL_PAD].sort(
  (a, b) => b.at.localeCompare(a.at),
)

export function auditForCase(caseId: string): AuditEntry[] {
  const authored = AUDIT_LOG.filter((e) => e.caseId === caseId)
  if (authored.length) return authored
  return seedAudit(caseId)
}

export function accessTrail(caseId: string): AuditEntry[] {
  return auditForCase(caseId).filter((e) => e.action === 'VIEW' || e.action === 'DOWNLOAD' || e.action === 'SHARE')
}

export const AUDIT_TOTAL = AUDIT_LOG.length
