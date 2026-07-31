/**
 * Sentinel domain model.
 *
 * GENDER NEUTRALITY IS A HARD REQUIREMENT. The PoSH Act's own drafting says "aggrieved
 * woman", but this product's model does not: parties are `Complainant` and
 * `Respondent`, and gender is a recorded attribute with a transgender option rather
 * than an assumption baked into the schema. No type, field or label in this file may
 * presume the gender of either party.
 */

/* ------------------------------------------------------------------ *
 * Roles and permissions
 * ------------------------------------------------------------------ */

export type Role =
  | 'employee'
  | 'hr_spoc'
  | 'posh_admin'
  | 'presiding_officer'
  | 'ic_member'
  | 'external_member'
  | 'management'
  | 'super_admin'

export const ROLES: Role[] = [
  'employee',
  'hr_spoc',
  'posh_admin',
  'presiding_officer',
  'ic_member',
  'external_member',
  'management',
  'super_admin',
]

export const ROLE_LABEL: Record<Role, string> = {
  employee: 'Employee',
  hr_spoc: 'HR SPOC',
  posh_admin: 'POSH Admin',
  presiding_officer: 'Presiding Officer',
  ic_member: 'Internal Committee member',
  external_member: 'External Member',
  management: 'Management',
  // Owner and super administrator are one panel: it provisions POSH Admin accounts
  // and oversees the caseload, but does not sit on any inquiry.
  super_admin: 'Company Owner / Super Admin',
}

/** Capabilities the UI gates on. Kept coarse — one flag per real decision. */
export type Permission =
  /** May see actual party names. False for management and employee. */
  | 'view:identities'
  /** May see cases other than their own. */
  | 'view:all_cases'
  /** May read inquiry content — evidence, hearings, depositions. */
  | 'view:inquiry'
  /** May read the audit trail. */
  | 'view:audit'
  /** May see aggregate dashboards. */
  | 'view:analytics'
  /** May register a complaint / edit intake fields. */
  | 'edit:intake'
  /** May record inquiry findings and move a case through its stages. */
  | 'edit:inquiry'
  /** May change system settings and roles. */
  | 'edit:settings'
  /** May screen intake, open dockets, assign boards and record the employer decision. */
  | 'workflow:administer'
  /** May act for the Internal Committee inside an inquiry. */
  | 'workflow:committee'
  /** May act as the complainant on their own case. */
  | 'workflow:complainant'
  /** May provision POSH Admin accounts. Owner / super administrator only. */
  | 'admin:provision'

/* ------------------------------------------------------------------ *
 * Parties
 * ------------------------------------------------------------------ */

export type Gender = 'female' | 'male' | 'transgender' | 'undisclosed'

export type PartyRole = 'complainant' | 'respondent' | 'witness'

export interface Party {
  id: string
  /** Always safe to render, for any role. */
  maskedName: string
  /** Never render without checking `can('view:identities')`. */
  actualName: string
  gender: Gender
  department: string
  location: string
  role: PartyRole
  designation: string
}

/* ------------------------------------------------------------------ *
 * Cases
 * ------------------------------------------------------------------ */

export type CaseStage =
  | 'registered'
  | 'notice_served'
  | 'awaiting_reply'
  | 'inquiry'
  | 'report_pending'
  | 'employer_action'
  | 'appeal_window'
  | 'closed'
  | 'archived'

export const CASE_STAGES: CaseStage[] = [
  'registered',
  'notice_served',
  'awaiting_reply',
  'inquiry',
  'report_pending',
  'employer_action',
  'appeal_window',
  'closed',
  'archived',
]

export const STAGE_LABEL: Record<CaseStage, string> = {
  registered: 'Registered',
  notice_served: 'Notice served',
  awaiting_reply: 'Awaiting reply',
  inquiry: 'In inquiry',
  report_pending: 'Report pending',
  employer_action: 'Employer action',
  appeal_window: 'Appeal window',
  closed: 'Closed',
  archived: 'Archived',
}

export type Priority = 'High' | 'Medium' | 'Low'

/** The statutory clocks tracked per case. All ISO date strings. */
export interface StatutoryMilestones {
  /** Notice to respondent — within 7 working days of the complaint (Rule 7). */
  noticeDue: string
  noticeServedOn: string | null
  /** Respondent's reply — within 10 working days of notice (Rule 7). */
  replyDue: string
  replyReceivedOn: string | null
  /** Inquiry completion — within 90 days of the complaint (s.11(4)). */
  inquiryDue: string
  inquiryCompletedOn: string | null
  /** IC report to the employer — within 10 days of inquiry completion (s.13(1)). */
  reportDue: string | null
  reportSubmittedOn: string | null
  /** Employer action on the recommendation — within 60 days (s.13(4)). */
  actionDue: string | null
  actionTakenOn: string | null
  /** Appeal window — 90 days from the recommendation (s.18). */
  appealWindowEnds: string | null
}

export interface Case {
  /** Format: POSH-2026-0142. */
  id: string
  stage: CaseStage
  filedDate: string
  incidentDate: string
  complainant: Party
  respondent: Party
  assignedIC: string[]
  location: string
  department: string
  priority: Priority
  milestones: StatutoryMilestones
  /** Days since filing, as at the reporting date. */
  daysElapsed: number
  /** Days left in the 90-day inquiry window. Negative once breached. */
  daysRemaining: number
  isBreached: boolean
  /** Required on the annual return whenever an inquiry runs past 90 days. */
  breachReason: string | null
  /** s.10 — conciliation may be requested by the complainant before inquiry. */
  conciliationRequested: boolean
  summary: string
  /**
   * Set only on cases raised through the in-app complaint form during this session.
   * Lets the complainant's tracker list a case they filed themselves without widening
   * the employee's view of the seeded caseload.
   */
  raisedBy?: Role
}

/* ------------------------------------------------------------------ *
 * Case detail records
 * ------------------------------------------------------------------ */

export interface Milestone {
  id: string
  caseId: string
  label: string
  /** The statutory provision this milestone derives from. */
  provision: string
  dueOn: string
  completedOn: string | null
  status: 'complete' | 'due' | 'overdue' | 'upcoming'
}

export type EvidenceType =
  | 'Document'
  | 'Email'
  | 'Message log'
  | 'Access log'
  | 'Statement'
  | 'Policy'
  | 'Medical'

export interface CustodyEvent {
  id: string
  at: string
  actorId: string
  action: 'Received' | 'Sealed' | 'Accessed' | 'Copied' | 'Returned' | 'Released' | 'Viewed' | 'Downloaded' | 'Shared'
  note: string
  /** Stable IP for chain-of-custody display. */
  ip: string
}

export interface EvidenceItem {
  id: string
  caseId: string
  /** Exhibit number as recorded in the inquiry register. */
  exhibitNo: string
  type: EvidenceType
  description: string
  submittedBy: string
  receivedOn: string
  status: 'In custody' | 'Released' | 'Archived'
  chainOfCustody: CustodyEvent[]
}

export type AuditAction =
  | 'VIEW'
  | 'DOWNLOAD'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SHARE'
  | 'LOGIN'
  | 'EXPORT'
  | 'STAGE_CHANGE'
  | 'ACCESS_DENIED'

/** PoSH = case/inquiry confidentiality trail. Technical = platform/security trail. */
export type AuditKind = 'posh' | 'technical'

export interface AuditEntry {
  id: string
  caseId: string
  at: string
  actorId: string
  action: AuditAction
  /** What was acted on, e.g. "Evidence E-04 · POSH-2026-0142". */
  entity: string
  ip: string
  detail: string
  kind: AuditKind
}

export interface Hearing {
  id: string
  caseId: string
  title: string
  type: 'Preliminary' | 'Deposition' | 'Cross examination' | 'Deliberation' | 'Final'
  status: 'Scheduled' | 'Completed' | 'Adjourned' | 'Cancelled'
  at: string
  durationMinutes: number
  location: string
  attendeeIds: string[]
  minutesRecorded: boolean
}

export type ActionStatus = 'To do' | 'In progress' | 'Overdue' | 'Done'

export interface ActionItem {
  id: string
  caseId: string
  title: string
  ownerId: string
  dueOn: string
  priority: Priority
  status: ActionStatus
}

export interface Communication {
  id: string
  caseId: string
  channel: 'Email' | 'Letter' | 'Portal notice' | 'In person'
  direction: 'Outbound' | 'Inbound'
  subject: string
  /** Named template from the communications library. */
  template: string
  /** Party or user id — never a raw name. */
  counterpartyId: string
  at: string
  acknowledged: boolean
  /** Delivery pipeline status shown in the workspace. */
  deliveryStatus: 'Delivered' | 'Acknowledged' | 'Pending' | 'Failed'
}

export interface DocumentRecord {
  id: string
  caseId: string
  name: string
  description: string
  category: 'Complaint' | 'Order' | 'Evidence' | 'Report' | 'Communication' | 'Compliance'
  access: 'All members' | 'Internal Committee' | 'Administrators only' | 'Legal and administrators'
  uploadedById: string
  uploadedAt: string
  sizeKb: number
  version: string
}

export interface User {
  id: string
  name: string
  initials: string
  email: string
  role: Role
  designation: string
  location: string
}
