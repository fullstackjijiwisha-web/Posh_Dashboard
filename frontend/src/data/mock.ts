/**
 * Supporting demo data.
 *
 * Every date and timestamp is stored as an ISO string and formatted at render time via
 * src/lib/format.ts. Nothing here carries a pre-formatted date, so the Indian date
 * conventions are applied in exactly one place.
 */

import { ORGANISATION } from '../lib/data/organisation'

export type Role = 'admin' | 'hr' | 'management' | 'ic'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  initials: string
  title: string
}

export const DEMO_USERS: User[] = [
  { id: '1', name: 'Saanya Kapoor', email: 'admin@company.com', role: 'admin', initials: 'SK', title: 'POSH administrator' },
  { id: '2', name: 'Rajesh Kumar', email: 'hr@company.com', role: 'hr', initials: 'RK', title: 'HR SPOC' },
  { id: '3', name: 'Vikram Mehta', email: 'mgmt@company.com', role: 'management', initials: 'VM', title: 'Management' },
  { id: '4', name: 'Priya Sharma', email: 'ic@company.com', role: 'ic', initials: 'PS', title: 'Internal Committee member' },
]

export const WORKFLOW_STAGES = [
  'Complaint',
  'Acknowledgement',
  'Committee',
  'Proceedings',
  'Evidence',
  'Report',
  'Management',
  'Closure',
  'Archive',
] as const

export type ComplaintStatus = 'Open' | 'In Progress' | 'Closed' | 'Overdue' | 'Pending'

export interface Complaint {
  id: string
  title: string
  status: ComplaintStatus
  complainant: string
  respondent: string
  assignee: string
  filed: string
  stage: string
  priority: 'High' | 'Medium' | 'Low'
}

export const COMPLAINTS: Complaint[] = [
  { id: 'POSH-2026-0151', title: 'Workplace conduct complaint', status: 'Open', complainant: 'Rhea Sequeira', respondent: 'Kabir Ahluwalia', assignee: 'Arjun Nair', filed: '2026-07-19', stage: 'Acknowledgement', priority: 'Low' },
  { id: 'POSH-2026-0150', title: 'Verbal harassment allegation', status: 'Open', complainant: 'Aarti Deshmukh', respondent: 'Manish Oberoi', assignee: 'Vikram Mehta', filed: '2026-07-05', stage: 'Committee', priority: 'Low' },
  { id: 'POSH-2026-0149', title: 'Hostile work environment', status: 'In Progress', complainant: 'Nandini Ghosh', respondent: 'Suresh Iyengar', assignee: 'Rajesh Kumar', filed: '2026-06-20', stage: 'Proceedings', priority: 'Low' },
  { id: 'POSH-2026-0148', title: 'Inappropriate conduct — Operations', status: 'In Progress', complainant: 'Pooja Grewal', respondent: 'Aditya Saxena', assignee: 'Priya Sharma', filed: '2026-06-06', stage: 'Evidence', priority: 'Low' },
  { id: 'POSH-2026-0147', title: 'Retaliation after complaint', status: 'In Progress', complainant: 'Lakshmi Nandan', respondent: 'Varun Malhotra', assignee: 'Farah Qureshi', filed: '2026-05-31', stage: 'Proceedings', priority: 'Medium' },
  { id: 'POSH-2026-0146', title: 'Sexual harassment complaint', status: 'In Progress', complainant: 'Ishita Verma', respondent: 'Rohan Kapadia', assignee: 'Neha Iyer', filed: '2026-05-28', stage: 'Report', priority: 'Medium' },
  { id: 'POSH-2026-0142', title: 'Sexual harassment complaint — Engineering', status: 'Overdue', complainant: 'Ananya Pillai', respondent: 'Gaurav Sethi', assignee: 'Rajesh Kumar', filed: '2026-05-08', stage: 'Evidence', priority: 'High' },
  { id: 'POSH-2026-0138', title: 'Discrimination report', status: 'Closed', complainant: 'Aisha Rahman', respondent: 'Jatin Chaudhary', assignee: 'Deepak Rao', filed: '2026-03-03', stage: 'Closed', priority: 'Low' },
]

export interface TimelineEvent {
  type: string
  /** ISO timestamp. */
  at: string
  title: string
}

export const CASE_TIMELINE: TimelineEvent[] = [
  { type: 'Filing', at: '2026-05-08T09:30', title: 'Complaint filed' },
  { type: 'Acknowledgement', at: '2026-05-08T14:15', title: 'Complaint acknowledged' },
  { type: 'Document', at: '2026-05-11T10:00', title: 'Supporting documents uploaded' },
  { type: 'Committee', at: '2026-05-15T11:00', title: 'Internal Committee preliminary meeting' },
  { type: 'Notice', at: '2026-05-18T16:00', title: 'Interim measure — no-contact directive' },
  { type: 'Document', at: '2026-05-21T09:45', title: "Respondent's reply received" },
  { type: 'Committee', at: '2026-05-25T10:30', title: 'Inquiry committee constituted' },
  { type: 'Hearing', at: '2026-06-02T14:00', title: 'Complainant deposition recorded' },
  { type: 'Document', at: '2026-06-09T11:15', title: 'HR policy documents referenced' },
  { type: 'Hearing', at: '2026-06-18T15:00', title: 'Witness examination completed' },
]

export interface Hearing {
  id: string
  caseId: string
  title: string
  type: string
  status: 'Scheduled' | 'Completed' | 'Adjourned' | 'Cancelled'
  /** ISO timestamp. */
  at: string
  duration: string
  location: string
}

export const HEARINGS: Hearing[] = [
  { id: 'HRG-0021', caseId: 'POSH-2026-0142', title: 'Initial hearing — complainant statement', type: 'Initial hearing', status: 'Scheduled', at: '2026-08-04T10:00', duration: '2 hours', location: 'Conference room B, floor 3' },
  { id: 'HRG-0022', caseId: 'POSH-2026-0142', title: 'Respondent statement recording', type: 'Initial hearing', status: 'Scheduled', at: '2026-08-06T11:00', duration: '2 hours', location: 'Conference room B, floor 3' },
  { id: 'HRG-0023', caseId: 'POSH-2026-0141', title: 'Deliberation session', type: 'Deliberation', status: 'Scheduled', at: '2026-08-10T14:00', duration: '2 hours', location: 'Conference room A, floor 3' },
  { id: 'HRG-0018', caseId: 'POSH-2026-0144', title: 'Preliminary inquiry meeting', type: 'Initial hearing', status: 'Completed', at: '2026-07-10T09:30', duration: '1 hour', location: 'HR department, floor 2' },
  { id: 'HRG-0019', caseId: 'POSH-2026-0140', title: 'Final hearing — closing submissions', type: 'Final hearing', status: 'Adjourned', at: '2026-07-15T10:00', duration: '3 hours', location: 'Board room, floor 7' },
  { id: 'HRG-0020', caseId: 'POSH-2026-0143', title: 'Cross examination — respondent', type: 'Cross examination', status: 'Completed', at: '2026-07-18T15:00', duration: '2 hours', location: 'Virtual — Microsoft Teams' },
  { id: 'HRG-0017', caseId: 'POSH-2026-0145', title: 'Witness examination', type: 'Witness examination', status: 'Completed', at: '2026-07-22T14:00', duration: '90 minutes', location: 'Legal department, floor 5' },
]

export interface DocumentItem {
  name: string
  description: string
  category: string
  caseId: string
  access: string
  uploadedBy: string
  /** ISO timestamp. */
  uploadedAt: string
  sizeKb: number
  version: string
}

export const DOCUMENTS: DocumentItem[] = [
  { name: 'Complaint_form_signed.pdf', description: 'Original signed complaint form submitted by the complainant', category: 'Complaint', caseId: 'POSH-2026-0142', access: 'Internal Committee', uploadedBy: 'System', uploadedAt: '2026-05-08T09:32', sizeKb: 245, version: 'v1' },
  { name: 'Acknowledgement_letter.pdf', description: 'Formal acknowledgement issued to the complainant', category: 'Communication', caseId: 'POSH-2026-0142', access: 'All members', uploadedBy: 'Rajesh Kumar', uploadedAt: '2026-05-08T14:20', sizeKb: 128, version: 'v2' },
  { name: 'IC_constitution_order.pdf', description: 'Order constituting the Internal Committee for this case', category: 'Order', caseId: 'POSH-2026-0142', access: 'All members', uploadedBy: 'Saanya Kapoor', uploadedAt: '2026-05-15T11:45', sizeKb: 180, version: 'v1' },
  { name: 'Witness_statement_01.pdf', description: 'Signed and notarised witness statement', category: 'Evidence', caseId: 'POSH-2026-0145', access: 'Internal Committee', uploadedBy: 'Neha Iyer', uploadedAt: '2026-06-18T16:05', sizeKb: 512, version: 'v3' },
  { name: 'Investigation_report_draft.docx', description: 'Working draft of the inquiry report — under review', category: 'Report', caseId: 'POSH-2026-0140', access: 'Administrators only', uploadedBy: 'Priya Sharma', uploadedAt: '2026-07-05T17:40', sizeKb: 890, version: 'v3' },
  { name: 'Evidence_access_logs.zip', description: 'Building access logs for the relevant dates', category: 'Evidence', caseId: 'POSH-2026-0143', access: 'Legal and administrators', uploadedBy: 'Deepak Rao', uploadedAt: '2026-06-03T10:12', sizeKb: 18400, version: 'v1' },
  { name: 'Conflict_declaration.pdf', description: 'Conflict of interest declaration by an Internal Committee member', category: 'Compliance', caseId: 'POSH-2026-0144', access: 'Administrators only', uploadedBy: 'Anita Desai', uploadedAt: '2026-07-03T12:00', sizeKb: 95, version: 'v1' },
  { name: 'Hearing_notice_HRG0021.pdf', description: 'Notice for the first hearing issued to both parties', category: 'Communication', caseId: 'POSH-2026-0142', access: 'All members', uploadedBy: 'System', uploadedAt: '2026-07-20T08:15', sizeKb: 142, version: 'v1' },
]

export interface EvidenceItem {
  id: string
  description: string
  source: string
  /** ISO date. */
  received: string
  status: 'In custody' | 'Released' | 'Archived'
}

export const EVIDENCE: EvidenceItem[] = [
  { id: 'EV-0031', description: 'Email correspondence between the parties', source: 'Complainant', received: '2026-05-08', status: 'In custody' },
  { id: 'EV-0032', description: 'Chat logs from the internal messaging platform', source: 'Complainant', received: '2026-05-11', status: 'In custody' },
  { id: 'EV-0033', description: 'Written witness statement', source: 'Witness', received: '2026-05-14', status: 'In custody' },
  { id: 'EV-0034', description: 'Sexual harassment prevention policy, version 3.2', source: 'Human Resources', received: '2026-04-30', status: 'In custody' },
  { id: 'EV-0035', description: 'Building access logs, floor 3', source: 'Facilities', received: '2026-05-02', status: 'Released' },
  { id: 'EV-0036', description: 'Prior complaint filing documents', source: 'Committee records', received: '2026-06-02', status: 'In custody' },
  { id: 'EV-0037', description: 'Occupational health assessment', source: 'Complainant', received: '2026-04-25', status: 'Archived' },
]

export type ActionStatus = 'To do' | 'In progress' | 'Overdue' | 'Done'

export interface ActionItem {
  title: string
  owner: string
  initials: string
  /** ISO date. */
  due: string
  priority: 'High' | 'Medium' | 'Low'
  caseId: string
  status: ActionStatus
}

export const ACTIONS: ActionItem[] = [
  { title: 'Schedule committee meeting', owner: 'Rajesh Kumar', initials: 'RK', due: '2026-08-03', priority: 'High', caseId: 'POSH-2026-0144', status: 'To do' },
  { title: 'Issue acknowledgement letter', owner: 'Neha Iyer', initials: 'NI', due: '2026-08-02', priority: 'High', caseId: 'POSH-2026-0151', status: 'To do' },
  { title: 'Serve notice on respondent', owner: 'Rajesh Kumar', initials: 'RK', due: '2026-08-05', priority: 'Medium', caseId: 'POSH-2026-0150', status: 'To do' },
  { title: 'File preliminary inquiry note', owner: 'Priya Sharma', initials: 'PS', due: '2026-08-06', priority: 'High', caseId: 'POSH-2026-0142', status: 'In progress' },
  { title: 'Collect witness statements', owner: 'Anita Desai', initials: 'AD', due: '2026-08-08', priority: 'Medium', caseId: 'POSH-2026-0148', status: 'In progress' },
  { title: 'Draft inquiry report', owner: 'Priya Sharma', initials: 'PS', due: '2026-08-12', priority: 'Low', caseId: 'POSH-2026-0146', status: 'In progress' },
  { title: 'Review evidence exhibits', owner: 'Vikram Mehta', initials: 'VM', due: '2026-07-28', priority: 'Medium', caseId: 'POSH-2026-0143', status: 'Overdue' },
  { title: 'Assign Internal Committee members', owner: 'Anita Desai', initials: 'AD', due: '2026-07-24', priority: 'High', caseId: 'POSH-2026-0139', status: 'Overdue' },
  { title: 'Prepare hearing minutes template', owner: 'System', initials: 'SY', due: '2026-07-22', priority: 'Low', caseId: 'POSH-2026-0141', status: 'Done' },
]

export interface FeedEvent {
  text: string
  /** ISO timestamp. */
  at: string
}

export const ALERTS: FeedEvent[] = [
  { text: 'POSH-2026-0139 has passed the 90-day inquiry deadline', at: '2026-07-31T09:12' },
  { text: 'Three documents pending review on POSH-2026-0142', at: '2026-07-31T08:40' },
  { text: 'Hearing scheduled for POSH-2026-0142 on 4 August', at: '2026-07-30T17:05' },
  { text: 'New complaint POSH-2026-0151 filed', at: '2026-07-19T11:22' },
  { text: 'Committee assignment overdue for POSH-2026-0150', at: '2026-07-28T14:35' },
]

export const ACTIVITY: FeedEvent[] = [
  { text: 'Complaint POSH-2026-0151 filed', at: '2026-07-19T11:22' },
  { text: 'POSH-2026-0150 moved to Committee stage', at: '2026-07-29T15:48' },
  { text: 'Hearing HRG-0021 scheduled', at: '2026-07-28T10:15' },
  { text: 'Inquiry report submitted for POSH-2026-0146', at: '2026-07-27T16:30' },
  { text: 'Committee members assigned to POSH-2026-0148', at: '2026-07-26T09:05' },
]

/**
 * Organisation-wide compliance figures.
 *
 * This block used to declare itself the single source of truth while hardcoding 2,450
 * employees — against a Board's Report disclosing 4,482 and an annual return saying 2.
 * Headcount and coverage now come from `ORGANISATION`, which sums them from the office
 * list, so the three can no longer disagree.
 */
export const COMPLIANCE = {
  score: 78,
  get totalEmployees() {
    return ORGANISATION.headcount
  },
  get trainingCoveragePct() {
    return ORGANISATION.trainingCoveragePct
  },
  get trainedEmployees() {
    return ORGANISATION.trainedEmployees
  },
  breakdown: [
    { label: 'Policy adherence', value: 92 },
    { label: 'Training coverage', value: 94 },
    { label: 'Case timeliness', value: 91 },
    { label: 'Documentation', value: 68 },
  ],
}

export const DEPARTMENTS = [
  { name: 'Engineering', count: 6 },
  { name: 'Finance', count: 4 },
  { name: 'Human Resources', count: 3 },
  { name: 'Marketing', count: 5 },
  { name: 'Operations', count: 4 },
  { name: 'Legal', count: 2 },
]

export const AGEING_DATA = [
  { month: 'Feb', Acknowledgement: 4, Committee: 6, Proceedings: 3, Evidence: 2, Report: 1 },
  { month: 'Mar', Acknowledgement: 5, Committee: 4, Proceedings: 5, Evidence: 3, Report: 2 },
  { month: 'Apr', Acknowledgement: 3, Committee: 7, Proceedings: 4, Evidence: 4, Report: 3 },
  { month: 'May', Acknowledgement: 6, Committee: 5, Proceedings: 6, Evidence: 2, Report: 4 },
  { month: 'Jun', Acknowledgement: 4, Committee: 8, Proceedings: 5, Evidence: 5, Report: 2 },
  { month: 'Jul', Acknowledgement: 7, Committee: 6, Proceedings: 8, Evidence: 3, Report: 5 },
]

export interface ReportItem {
  name: string
  format: string
  type: string
  /** ISO date. */
  generated: string
  sizeKb: number
}

export const REPORTS: ReportItem[] = [
  { name: 'Monthly report — June 2026', format: 'PDF', type: 'Monthly report', generated: '2026-07-02', sizeKb: 1229 },
  { name: 'Compliance report — Q1 FY 2026-27', format: 'Excel', type: 'Compliance report', generated: '2026-06-30', sizeKb: 856 },
  { name: 'Case summary — POSH-2026-0142', format: 'PDF', type: 'Case summary', generated: '2026-07-20', sizeKb: 2150 },
  { name: 'Training report — H1 2026', format: 'PDF', type: 'Training report', generated: '2026-06-30', sizeKb: 3482 },
  { name: 'Monthly report — May 2026', format: 'Excel', type: 'Monthly report', generated: '2026-06-03', sizeKb: 978 },
]

export interface AuditEntry {
  actor: string
  action: string
  target: string
  /** ISO timestamp. */
  at: string
  ip: string
}

export const AUDIT_LOG: AuditEntry[] = [
  { actor: 'Saanya Kapoor', action: 'Updated case stage to Committee', target: 'POSH-2026-0150', at: '2026-07-31T09:12', ip: '10.0.1.42' },
  { actor: 'Rajesh Kumar', action: 'Uploaded document', target: 'Acknowledgement_letter.pdf', at: '2026-07-31T08:40', ip: '10.0.1.18' },
  { actor: 'Priya Sharma', action: 'Scheduled hearing', target: 'HRG-0021', at: '2026-07-30T17:05', ip: '10.0.2.11' },
  { actor: 'System', action: 'Statutory deadline alert raised', target: 'POSH-2026-0139', at: '2026-07-30T00:05', ip: '—' },
  { actor: 'Anita Desai', action: 'Declared conflict of interest', target: 'POSH-2026-0144', at: '2026-07-29T15:48', ip: '10.0.1.55' },
  { actor: 'Saanya Kapoor', action: 'Exported compliance report', target: 'Q1 FY 2026-27', at: '2026-07-28T14:35', ip: '10.0.1.42' },
  { actor: 'Vikram Mehta', action: 'Added evidence EV-0033', target: 'POSH-2026-0145', at: '2026-07-27T16:30', ip: '10.0.2.33' },
  { actor: 'System', action: 'Auto-archived closed case', target: 'POSH-2026-0134', at: '2026-07-26T02:00', ip: '—' },
]

export const ROLES = [
  { name: 'Employee', users: 2450, perms: ['View own cases', 'File complaint', 'Upload documents'] },
  { name: 'HR SPOC', users: 8, perms: ['View assigned cases', 'Intake queue', 'Communications', 'Acknowledgements'] },
  { name: 'POSH administrator', users: 3, perms: ['Full case access', 'Workflow control', 'Dashboards', 'User management'] },
  { name: 'Internal Committee member', users: 12, perms: ['View assigned cases', 'Hearing schedule', 'Evidence access', 'Minutes'] },
  { name: 'External Member', users: 4, perms: ['View assigned cases', 'Read and annotate'] },
  { name: 'Legal', users: 5, perms: ['Case workspace', 'Report review', 'Compliance exports'] },
  { name: 'Management', users: 15, perms: ['Anonymised dashboard only'] },
  { name: 'Super administrator', users: 2, perms: ['System configuration', 'Role management', 'Audit logs', 'Retention'] },
]
