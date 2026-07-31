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
  { id: '1', name: 'Saanya Kapoor', email: 'admin@company.com', role: 'admin', initials: 'SK', title: 'POSH Admin' },
  { id: '2', name: 'HR SPOC', email: 'hr@company.com', role: 'hr', initials: 'HS', title: 'HR SPOC' },
  { id: '3', name: 'Management', email: 'mgmt@company.com', role: 'management', initials: 'MG', title: 'Management' },
  { id: '4', name: 'IC Member', email: 'ic@company.com', role: 'ic', initials: 'IC', title: 'IC Member' },
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
  assignee: string
  filed: string
  stage: string
  priority: 'High' | 'Medium' | 'Low'
}

export const COMPLAINTS: Complaint[] = [
  { id: 'POSH-2024-024', title: 'Workplace Conduct Complaint', status: 'Open', complainant: 'Employee A', assignee: 'Priya Sharma', filed: '2024-06-15', stage: 'Complaint', priority: 'High' },
  { id: 'POSH-2024-020', title: 'Sexual Harassment Complaint', status: 'Open', complainant: 'Employee E', assignee: 'Unassigned', filed: '2024-06-12', stage: 'Acknowledgement', priority: 'High' },
  { id: 'POSH-2024-023', title: 'Harassment Allegation - Finance Dept', status: 'In Progress', complainant: 'Employee B', assignee: 'Rajesh Kumar', filed: '2024-06-10', stage: 'Committee', priority: 'High' },
  { id: 'POSH-2024-022', title: 'Discrimination Report', status: 'In Progress', complainant: 'Employee C', assignee: 'Anita Desai', filed: '2024-05-28', stage: 'Proceedings', priority: 'Medium' },
  { id: 'POSH-2024-021', title: 'Bullying Incident - Marketing', status: 'In Progress', complainant: 'Employee D', assignee: 'Vikram Mehta', filed: '2024-05-20', stage: 'Evidence', priority: 'Medium' },
  { id: 'POSH-2024-019', title: 'Hostile Work Environment', status: 'In Progress', complainant: 'Employee F', assignee: 'Priya Sharma', filed: '2024-05-15', stage: 'Report', priority: 'Medium' },
  { id: 'POSH-2024-017', title: 'Retaliation Complaint', status: 'Overdue', complainant: 'Employee H', assignee: 'Anita Desai', filed: '2024-05-05', stage: 'Committee', priority: 'High' },
  { id: 'POSH-2024-018', title: 'Inappropriate Behavior - IT', status: 'Closed', complainant: 'Employee G', assignee: 'Rajesh Kumar', filed: '2024-04-30', stage: 'Closed', priority: 'Low' },
]

export interface TimelineEvent {
  type: string
  date: string
  title: string
}

export const CASE_TIMELINE: TimelineEvent[] = [
  { type: 'FILING', date: '15 Jun 2026 · 09:30 am', title: 'Complaint Filed' },
  { type: 'ACKNOWLEDGEMENT', date: '15 Jun 2026 · 02:15 pm', title: 'Complaint Acknowledged' },
  { type: 'DOCUMENT', date: '18 Jun 2026 · 10:00 am', title: 'Supporting Documents Uploaded' },
  { type: 'COMMITTEE', date: '22 Jun 2026 · 11:00 am', title: 'ICC Preliminary Meeting' },
  { type: 'ALERT', date: '25 Jun 2026 · 04:00 pm', title: 'Interim Measure: No-Contact Directive' },
  { type: 'DOCUMENT', date: '28 Jun 2026 · 09:45 am', title: "Respondent's Reply Received" },
  { type: 'COMMITTEE', date: '2 Jul 2026 · 10:30 am', title: 'Investigation Committee Formed' },
  { type: 'HEARING', date: '10 Jul 2026 · 02:00 pm', title: 'Complainant Deposition Scheduled' },
  { type: 'DOCUMENT', date: '14 Jul 2026 · 11:15 am', title: 'HR Policy Documents Referenced' },
  { type: 'HEARING', date: '20 Jul 2026 · 03:00 pm', title: 'Witness Interview Completed' },
]

export interface Hearing {
  id: string
  caseId: string
  title: string
  type: string
  status: 'Scheduled' | 'Completed' | 'Adjourned' | 'Cancelled'
  when: string
  duration: string
  location: string
}

export const HEARINGS: Hearing[] = [
  { id: 'HRG-001', caseId: 'POSH-2026-0042', title: 'Initial Hearing — Complainant Statement', type: 'Initial Hearing', status: 'Scheduled', when: '2026-07-28 · 10:00 AM', duration: '2 hours', location: 'Conference Room B, Floor 3' },
  { id: 'HRG-002', caseId: 'POSH-2026-0042', title: 'Respondent Statement Recording', type: 'Initial Hearing', status: 'Scheduled', when: '2026-08-04 · 11:00 AM', duration: '2 hours', location: 'Conference Room B, Floor 3' },
  { id: 'HRG-007', caseId: 'POSH-2026-0035', title: 'Deliberation Session', type: 'Deliberation', status: 'Scheduled', when: '2026-08-10 · 02:00 PM', duration: '2 hours', location: 'Conference Room A, Floor 3' },
  { id: 'HRG-006', caseId: 'POSH-2026-0038', title: 'Preliminary Inquiry Meeting', type: 'Initial Hearing', status: 'Completed', when: '2026-07-10 · 09:30 AM', duration: '1 hour', location: 'HR Department, Floor 2' },
  { id: 'HRG-005', caseId: 'POSH-2026-0039', title: 'Final Hearing — Closing Arguments', type: 'Final Hearing', status: 'Adjourned', when: '2026-07-15 · 10:00 AM', duration: '3 hours', location: 'Board Room, Floor 7' },
  { id: 'HRG-004', caseId: 'POSH-2026-0040', title: 'Cross Examination — Respondent', type: 'Cross Examination', status: 'Completed', when: '2026-07-18 · 03:00 PM', duration: '2 hours', location: 'Virtual — MS Teams' },
  { id: 'HRG-003', caseId: 'POSH-2026-0041', title: 'Witness Examination — Rohit Verma', type: 'Witness Examination', status: 'Completed', when: '2026-07-22 · 02:00 PM', duration: '1.5 hours', location: 'Legal Department, Floor 5' },
]

export interface DocumentItem {
  name: string
  description: string
  category: string
  caseId: string
  access: string
  meta: string
  version: string
}

export const DOCUMENTS: DocumentItem[] = [
  { name: 'Complaint_Form_Signed.pdf', description: 'Original signed complaint form submitted by complainant', category: 'Complaint', caseId: 'POSH-2026-0042', access: 'IC Members', meta: 'System · 2026-06-15 · 245 KB', version: 'v1' },
  { name: 'Acknowledgement_Letter.pdf', description: 'Formal acknowledgement letter sent to complainant', category: 'Communication', caseId: 'POSH-2026-0042', access: 'All Members', meta: 'HR SPOC · 2026-06-17 · 128 KB', version: 'v2' },
  { name: 'IC_Committee_Constitution.pdf', description: 'Formal order constituting the Internal Committee for this case', category: 'Order', caseId: 'POSH-2026-0042', access: 'All Members', meta: 'POSH Admin · 2026-06-20 · 180 KB', version: 'v1' },
  { name: 'Witness_Statement_RV.pdf', description: 'Signed and notarized witness statement from Rohit Verma', category: 'Evidence', caseId: 'POSH-2026-0041', access: 'IC Members', meta: 'ICC Secretary · 2026-06-22 · 512 KB', version: 'v3' },
  { name: 'Investigation_Report_Draft_v3.docx', description: 'Working draft of investigation report — under review', category: 'Report', caseId: 'POSH-2026-0040', access: 'Admin Only', meta: 'Priya Sharma · 2026-07-05 · 890 KB', version: 'v3' },
  { name: 'Evidence_CCTV_Clips.zip', description: 'CCTV footage extracts from 3rd floor, 28 May 2026', category: 'Evidence', caseId: 'POSH-2026-0039', access: 'Legal & Admin', meta: 'Legal Department · 2026-06-03 · 18.4 MB', version: 'v1' },
  { name: 'Conflict_Declaration_Form.pdf', description: 'Conflict of interest declaration by IC member Anita Desai', category: 'Compliance', caseId: 'POSH-2026-0038', access: 'Admin Only', meta: 'Anita Desai · 2026-07-03 · 95 KB', version: 'v1' },
  { name: 'Hearing_Notice_HRG001.pdf', description: 'Official notice for first hearing issued to both parties', category: 'Communication', caseId: 'POSH-2026-0042', access: 'All Members', meta: 'System · 2026-07-20 · 142 KB', version: 'v1' },
]

export interface EvidenceItem {
  id: string
  description: string
  source: string
  date: string
  status: 'In Custody' | 'Released' | 'Archived'
}

export const EVIDENCE: EvidenceItem[] = [
  { id: 'EV-001', description: 'Email correspondence between complainant and respondent', source: 'Complainant', date: '2026-06-15', status: 'In Custody' },
  { id: 'EV-002', description: 'Chat logs from internal messaging platform', source: 'Complainant', date: '2026-06-18', status: 'In Custody' },
  { id: 'EV-003', description: 'Written witness statement from Rohit Verma', source: 'Witness', date: '2026-06-20', status: 'In Custody' },
  { id: 'EV-004', description: 'HR Policy document - Sexual Harassment Prevention Policy v3.2', source: 'HR Department', date: '2026-05-30', status: 'In Custody' },
  { id: 'EV-005', description: 'CCTV footage from office floor 3', source: 'Facilities', date: '2026-06-01', status: 'Released' },
  { id: 'EV-006', description: 'Prior complaint filing documents (POSH-2025-0091)', source: 'ICC Records', date: '2026-07-02', status: 'In Custody' },
  { id: 'EV-007', description: 'Medical report - complainant stress assessment', source: 'Complainant', date: '2026-04-25', status: 'Archived' },
]

export type ActionStatus = 'To Do' | 'In Progress' | 'Overdue' | 'Done'

export interface ActionItem {
  title: string
  owner: string
  initials: string
  due: string
  priority: 'High' | 'Medium' | 'Low'
  caseId: string
  status: ActionStatus
}

export const ACTIONS: ActionItem[] = [
  { title: 'Schedule committee meeting', owner: 'Rajesh Kumar', initials: 'RK', due: '2024-06-18', priority: 'High', caseId: 'POSH-2024-023', status: 'To Do' },
  { title: 'Send acknowledgement letter', owner: 'HR SPOC', initials: 'HS', due: '2024-06-16', priority: 'High', caseId: 'POSH-2024-020', status: 'To Do' },
  { title: 'Notify respondent', owner: 'Rajesh Kumar', initials: 'RK', due: '2024-06-21', priority: 'Medium', caseId: 'POSH-2024-024', status: 'To Do' },
  { title: 'File initial complaint report', owner: 'Priya Sharma', initials: 'PS', due: '2024-06-20', priority: 'High', caseId: 'POSH-2024-024', status: 'In Progress' },
  { title: 'Collect witness statements', owner: 'Anita Desai', initials: 'AD', due: '2024-06-22', priority: 'Medium', caseId: 'POSH-2024-022', status: 'In Progress' },
  { title: 'Draft investigation report', owner: 'Priya Sharma', initials: 'PS', due: '2024-06-25', priority: 'Low', caseId: 'POSH-2024-019', status: 'In Progress' },
  { title: 'Review evidence documents', owner: 'Vikram Mehta', initials: 'VM', due: '2024-06-15', priority: 'Medium', caseId: 'POSH-2024-021', status: 'Overdue' },
  { title: 'Assign IC members', owner: 'Anita Desai', initials: 'AD', due: '2024-06-10', priority: 'High', caseId: 'POSH-2024-017', status: 'Overdue' },
  { title: 'Prepare hearing minutes template', owner: 'System', initials: 'S', due: '2024-06-19', priority: 'Low', caseId: 'POSH-2024-023', status: 'Done' },
]

export const ALERTS = [
  { text: 'Case POSH-2024-017 SLA breach in 2 days', time: '2 hours ago' },
  { text: '3 documents pending review', time: '4 hours ago' },
  { text: 'Hearing scheduled for POSH-2024-012 tomorrow', time: '6 hours ago' },
  { text: 'New complaint POSH-2024-024 filed', time: '1 day ago' },
  { text: 'IC Member assignment overdue for POSH-2024-020', time: '3 days ago' },
]

export const ACTIVITY = [
  { text: 'New complaint filed by Employee A', time: '2 hours ago' },
  { text: 'Case POSH-2024-023 moved to Committee', time: '4 hours ago' },
  { text: 'Hearing scheduled for POSH-2024-012', time: '6 hours ago' },
  { text: 'Report submitted for POSH-2024-019', time: 'Yesterday' },
  { text: 'IC Members assigned to POSH-2024-022', time: 'Yesterday' },
]

export const DEPARTMENTS = [
  { name: 'Engineering', count: 6 },
  { name: 'Finance', count: 4 },
  { name: 'HR', count: 3 },
  { name: 'Marketing', count: 5 },
  { name: 'Operations', count: 4 },
  { name: 'Legal', count: 2 },
]

export const AGEING_DATA = [
  { month: 'Jan', Acknowledgement: 4, Committee: 6, Proceedings: 3, Evidence: 2, Report: 1 },
  { month: 'Feb', Acknowledgement: 5, Committee: 4, Proceedings: 5, Evidence: 3, Report: 2 },
  { month: 'Mar', Acknowledgement: 3, Committee: 7, Proceedings: 4, Evidence: 4, Report: 3 },
  { month: 'Apr', Acknowledgement: 6, Committee: 5, Proceedings: 6, Evidence: 2, Report: 4 },
  { month: 'May', Acknowledgement: 4, Committee: 8, Proceedings: 5, Evidence: 5, Report: 2 },
  { month: 'Jun', Acknowledgement: 7, Committee: 6, Proceedings: 8, Evidence: 3, Report: 5 },
]

export const REPORTS = [
  { name: 'Monthly Report - June 2026', format: 'PDF', type: 'Monthly Report', date: '2026-07-02', size: '1.2 MB' },
  { name: 'Compliance Report - Q2 2026', format: 'Excel', type: 'Compliance Report', date: '2026-06-30', size: '856 KB' },
  { name: 'Case Summary - POSH-2026-0042', format: 'PDF', type: 'Case Summary', date: '2026-07-20', size: '2.1 MB' },
  { name: 'Training Report - H1 2026', format: 'PDF', type: 'Training Report', date: '2026-06-30', size: '3.4 MB' },
  { name: 'Monthly Report - May 2026', format: 'Excel', type: 'Monthly Report', date: '2026-06-03', size: '978 KB' },
]

export const AUDIT_LOG = [
  { actor: 'Saanya Kapoor', action: 'Updated case stage to Committee', target: 'POSH-2024-023', time: '2 hours ago', ip: '10.0.1.42' },
  { actor: 'HR SPOC', action: 'Uploaded document', target: 'Acknowledgement_Letter.pdf', time: '4 hours ago', ip: '10.0.1.18' },
  { actor: 'Priya Sharma', action: 'Scheduled hearing', target: 'HRG-001', time: '6 hours ago', ip: '10.0.2.11' },
  { actor: 'System', action: 'SLA alert triggered', target: 'POSH-2024-017', time: '1 day ago', ip: '—' },
  { actor: 'Anita Desai', action: 'Declared conflict of interest', target: 'POSH-2026-0038', time: '2 days ago', ip: '10.0.1.55' },
  { actor: 'Saanya Kapoor', action: 'Exported compliance report', target: 'Q2 2026', time: '3 days ago', ip: '10.0.1.42' },
  { actor: 'Vikram Mehta', action: 'Added evidence EV-003', target: 'POSH-2026-0041', time: '4 days ago', ip: '10.0.2.33' },
  { actor: 'System', action: 'Auto-archived closed case', target: 'POSH-2024-018', time: '5 days ago', ip: '—' },
]

export const ROLES = [
  { name: 'Employee', users: 245, perms: ['View Own Cases', 'File Complaint', 'Upload Documents'] },
  { name: 'HR SPOC', users: 8, perms: ['View Assigned Cases', 'Intake Queue', 'Communications', 'Acknowledgements'] },
  { name: 'POSH Admin', users: 3, perms: ['Full Case Access', 'Workflow Control', 'Dashboards', 'User Management'] },
  { name: 'IC Member', users: 12, perms: ['View Assigned Cases', 'Hearing Schedule', 'Evidence Access', 'Minutes'] },
  { name: 'External Member', users: 4, perms: ['View Assigned Cases', 'Read & Annotate'] },
  { name: 'Legal', users: 5, perms: ['Case Workspace', 'Report Review', 'Compliance Exports'] },
  { name: 'Management', users: 15, perms: ['Anonymised Dashboard Only'] },
  { name: 'Super Admin', users: 2, perms: ['System Config', 'Role Management', 'Audit Logs', 'Retention'] },
]
