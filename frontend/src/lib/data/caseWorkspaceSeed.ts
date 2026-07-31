/**
 * Ensures every case workspace tab has demo content — no empty screens.
 * Authored records in caseDetail/evidence/audit win; this fills the gaps.
 */

import { CASES } from './cases'
import { dateNDaysAgo } from './statutory'
import type {
  ActionItem,
  Communication,
  DocumentRecord,
  EvidenceItem,
  Hearing,
  AuditEntry,
  CustodyEvent,
} from './types'

const at = (daysAgo: number, time: string) => `${dateNDaysAgo(daysAgo)}T${time}`

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

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

export function seedHearings(caseId: string, count = 2): Hearing[] {
  const c = CASES.find((x) => x.id === caseId)
  if (!c) return []
  const age = Math.max(c.daysElapsed - 5, 2)
  return Array.from({ length: count }, (_, i) => ({
    id: `HRG-seed-${caseId.slice(-4)}-${i + 1}`,
    caseId,
    title: i === 0 ? 'Preliminary sitting' : 'Panel review sitting',
    type: i === 0 ? 'Preliminary' : 'Deliberation',
    status: i === 0 ? 'Completed' : c.stage === 'inquiry' || c.stage === 'awaiting_reply' ? 'Scheduled' : 'Completed',
    at: at(Math.max(age - i * 8, 1), i === 0 ? '10:30' : '15:00'),
    durationMinutes: 60 + i * 30,
    location: `Committee room · ${c.location.split('—')[0].trim()}`,
    attendeeIds: c.assignedIC.slice(0, Math.min(3, c.assignedIC.length)),
    minutesRecorded: i === 0,
  })) as Hearing[]
}

export function seedDocuments(caseId: string): DocumentRecord[] {
  const c = CASES.find((x) => x.id === caseId)
  if (!c) return []
  const age = c.daysElapsed
  return [
    {
      id: `doc-seed-${caseId}-1`,
      caseId,
      name: 'Complaint_form_signed.pdf',
      description: 'Signed complaint form on record',
      category: 'Complaint',
      access: 'Internal Committee',
      uploadedById: 'u-hr',
      uploadedAt: at(age, '11:00'),
      sizeKb: 180 + (hash(caseId) % 80),
      version: 'v1',
    },
    {
      id: `doc-seed-${caseId}-2`,
      caseId,
      name: 'Acknowledgement_letter.pdf',
      description: 'Acknowledgement issued to the complainant',
      category: 'Communication',
      access: 'All members',
      uploadedById: 'u-hr',
      uploadedAt: at(Math.max(age - 1, 0), '10:15'),
      sizeKb: 96,
      version: 'v1',
    },
    {
      id: `doc-seed-${caseId}-3`,
      caseId,
      name: c.stage === 'report_pending' || c.stage === 'employer_action' || c.stage === 'closed' || c.stage === 'archived'
        ? 'Inquiry_report.pdf'
        : 'Case_notes_working.docx',
      description: 'Working case documentation for the Internal Committee',
      category: 'Report',
      access: 'Internal Committee',
      uploadedById: 'u-po',
      uploadedAt: at(Math.max(age - Math.min(20, age - 1), 1), '16:00'),
      sizeKb: 420,
      version: c.daysElapsed > 60 ? 'v2' : 'v1',
    },
  ]
}

export function seedCommunications(caseId: string): Communication[] {
  const c = CASES.find((x) => x.id === caseId)
  if (!c) return []
  const age = c.daysElapsed
  return [
    {
      id: `com-seed-${caseId}-1`,
      caseId,
      channel: 'Portal notice',
      direction: 'Inbound',
      subject: 'Complaint submitted',
      template: 'Intake — employee portal receipt',
      counterpartyId: `${caseId}-complainant`,
      at: at(age, '09:20'),
      acknowledged: true,
      deliveryStatus: 'Acknowledged',
    },
    {
      id: `com-seed-${caseId}-2`,
      caseId,
      channel: 'Email',
      direction: 'Outbound',
      subject: 'Acknowledgement of your complaint',
      template: 'TMPL-ACK-01 — Complaint acknowledgement',
      counterpartyId: `${caseId}-complainant`,
      at: at(Math.max(age - 1, 0), '10:05'),
      acknowledged: true,
      deliveryStatus: 'Acknowledged',
    },
    {
      id: `com-seed-${caseId}-3`,
      caseId,
      channel: 'Letter',
      direction: 'Outbound',
      subject: c.milestones.noticeServedOn
        ? 'Notice under Rule 7(1)'
        : 'Intake confirmation pending notice',
      template: 'TMPL-NTR-01 — Notice to respondent',
      counterpartyId: `${caseId}-respondent`,
      at: at(Math.max(age - 4, 0), '11:00'),
      acknowledged: Boolean(c.milestones.noticeServedOn),
      deliveryStatus: c.milestones.noticeServedOn ? 'Acknowledged' : 'Pending',
    },
  ]
}

export function seedActions(caseId: string): ActionItem[] {
  const c = CASES.find((x) => x.id === caseId)
  if (!c) return []
  const owner = pick(['u-po', 'u-ic', 'u-hr'], hash(caseId))
  return [
    {
      id: `act-seed-${caseId}-1`,
      caseId,
      title: c.isBreached
        ? 'Record Rule 8(5) delay disclosure'
        : c.daysRemaining <= 14
          ? 'Complete inquiry within remaining statutory window'
          : 'Advance case to next statutory milestone',
      ownerId: owner,
      dueOn: dateNDaysAgo(c.daysRemaining <= 7 ? 2 : -5),
      priority: c.priority,
      status: c.daysRemaining <= 7 || c.isBreached ? 'Overdue' : 'In progress',
    },
    {
      id: `act-seed-${caseId}-2`,
      caseId,
      title: 'Update case file and circulate panel notes',
      ownerId: 'u-ic',
      dueOn: dateNDaysAgo(-3),
      priority: 'Medium',
      status: 'To do',
    },
    {
      id: `act-seed-${caseId}-3`,
      caseId,
      title: 'Confirm conflict declarations on record',
      ownerId: 'u-admin',
      dueOn: dateNDaysAgo(Math.max(c.daysElapsed - 2, 1)),
      priority: 'Low',
      status: 'Done',
    },
  ]
}

export function seedEvidence(caseId: string): EvidenceItem[] {
  const c = CASES.find((x) => x.id === caseId)
  if (!c) return []
  const age = Math.max(c.daysElapsed - 3, 1)
  const chain = (exhibit: string): CustodyEvent[] => [
    {
      id: `coc-${caseId}-${exhibit}-1`,
      at: at(age, '10:00'),
      actorId: 'u-hr',
      action: 'Received',
      note: 'Received into the case vault.',
      ip: IP['u-hr'],
    },
    {
      id: `coc-${caseId}-${exhibit}-2`,
      at: at(age, '10:25'),
      actorId: 'u-hr',
      action: 'Sealed',
      note: 'Sealed with hash recorded.',
      ip: IP['u-hr'],
    },
    {
      id: `coc-${caseId}-${exhibit}-3`,
      at: at(Math.max(age - 5, 0), '14:10'),
      actorId: 'u-po',
      action: 'Viewed',
      note: 'Reviewed by Presiding Officer.',
      ip: IP['u-po'],
    },
  ]
  return [
    {
      id: `ev-seed-${caseId}-1`,
      caseId,
      exhibitNo: 'E-01',
      type: 'Email',
      description: 'Primary documentary exhibit lodged with the complaint.',
      submittedBy: 'u-hr',
      receivedOn: dateNDaysAgo(age),
      status: 'In custody',
      chainOfCustody: chain('01'),
    },
    {
      id: `ev-seed-${caseId}-2`,
      caseId,
      exhibitNo: 'E-02',
      type: 'Statement',
      description: 'Party statement recorded for the inquiry register.',
      submittedBy: 'u-po',
      receivedOn: dateNDaysAgo(Math.max(age - 8, 1)),
      status: 'In custody',
      chainOfCustody: chain('02'),
    },
  ]
}

/** Compact timeline/audit seed when a case has no authored trail. */
export function seedAudit(caseId: string): AuditEntry[] {
  const c = CASES.find((x) => x.id === caseId)
  if (!c) return []
  const age = c.daysElapsed
  const rows: Array<[number, string, string, AuditEntry['action'], string, string, AuditEntry['kind']]> = [
    [age, '09:15', 'u-emp', 'CREATE', `Case ${caseId}`, 'Complaint registered through the employee portal.', 'posh'],
    [age, '09:40', 'u-hr', 'VIEW', `Case ${caseId}`, 'Intake triage opened.', 'posh'],
    [Math.max(age - 1, 0), '10:05', 'u-hr', 'CREATE', `Document: Complaint_form_signed.pdf · ${caseId}`, 'Signed complaint form filed.', 'posh'],
    [Math.max(age - 1, 0), '10:20', 'u-hr', 'VIEW', `Document: Complaint_form_signed.pdf · ${caseId}`, 'Reviewed before acknowledgement.', 'posh'],
    [Math.max(age - 2, 0), '11:00', 'u-po', 'VIEW', `Case ${caseId}`, 'Presiding Officer opened the case workspace.', 'posh'],
    [Math.max(age - 2, 0), '11:15', 'u-po', 'VIEW', `Evidence E-01 · ${caseId}`, 'Exhibit reviewed for admissibility.', 'posh'],
    [Math.max(age - 3, 0), '14:30', 'u-ic', 'VIEW', `Document: Acknowledgement_letter.pdf · ${caseId}`, 'Panel member viewed acknowledgement.', 'posh'],
    [Math.max(age - 4, 0), '09:50', 'u-admin', 'STAGE_CHANGE', `Case ${caseId}`, `Stage advanced to ${c.stage}.`, 'posh'],
    [Math.max(age - 5, 0), '16:00', 'u-ext', 'VIEW', `Evidence E-02 · ${caseId}`, 'External Member reviewed statement.', 'posh'],
    [Math.min(2, age), '08:30', 'u-admin', 'LOGIN', 'Platform session', 'Administrator signed in.', 'technical'],
    [Math.min(1, age), '12:10', 'u-mgmt', 'VIEW', 'Aggregate statistics', 'Anonymised management dashboard opened.', 'technical'],
    [0, '09:00', 'system', 'UPDATE', `Milestone clock · ${caseId}`, `Day ${c.daysElapsed} statutory clock tick.`, 'technical'],
  ]
  return rows.map(([daysAgo, time, actorId, action, entity, detail, kind], i) => ({
    id: `au-seed-${caseId}-${i + 1}`,
    caseId,
    at: `${dateNDaysAgo(daysAgo)}T${time}:0${i % 10}`,
    actorId,
    action,
    entity,
    ip: IP[actorId] ?? '—',
    detail,
    kind,
  })).sort((a, b) => b.at.localeCompare(a.at))
}
