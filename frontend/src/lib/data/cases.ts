/**
 * The 24-case demo caseload.
 *
 * Cases are authored by AGE and STAGE only. Every statutory date is computed by the
 * calculators in statutory.ts, so `noticeDue`, `replyDue` and `inquiryDue` are correct
 * by construction and the working-day provisions are never mistaken for calendar days.
 *
 * Distribution (24 total):
 *   9  open and on track      2  approaching breach (Day 78, Day 84)
 *   3  awaiting reply         1  breached (Day 96, with a recorded reason)
 *   4  in active inquiry      5  closed (3 closed, 2 archived)
 *
 * POSH-2026-0142 is the flagship: Day 84 of 90, in inquiry, with evidence, hearings,
 * documents, communications and a full audit trail attached.
 */

import { differenceInCalendarDays, parseISO } from 'date-fns'
import {
  appealWindowEnd,
  daysUntil,
  dateNDaysAgo,
  employerActionDeadline,
  inquiryDeadline,
  noticeDeadline,
  replyDeadline,
  reportDeadline,
} from './statutory'
import { CASE_STAGES, type Case, type CaseStage, type Gender, type Party, type Priority } from './types'

const stageIndex = (s: CaseStage) => CASE_STAGES.indexOf(s)
const reached = (s: CaseStage, target: CaseStage) => stageIndex(s) >= stageIndex(target)

interface PartySeed {
  name: string
  gender: Gender
  designation: string
}

interface CaseSeed {
  id: string
  stage: CaseStage
  daysElapsed: number
  /** Days between the incident and the complaint being filed. */
  incidentLag: number
  complainant: PartySeed
  respondent: PartySeed
  location: string
  department: string
  priority: Priority
  assignedIC: string[]
  conciliationRequested?: boolean
  breachReason?: string
  summary: string
  /** Days after filing that the inquiry actually concluded (post-inquiry stages only). */
  inquiryTookDays?: number
}

const PANEL_FULL = ['u-po', 'u-ic', 'u-ext']
const PANEL_CORE = ['u-po', 'u-ic']
const PANEL_WIDE = ['u-po', 'u-ic', 'u-ext', 'u-legal']

const SEEDS: CaseSeed[] = [
  /* --- 9 open and on track ------------------------------------------- */
  { id: 'POSH-2026-0158', stage: 'registered', daysElapsed: 3, incidentLag: 6, complainant: { name: 'Rhea Sequeira', gender: 'female', designation: 'Business Analyst' }, respondent: { name: 'Kabir Ahluwalia', gender: 'male', designation: 'Engineering Manager' }, location: 'Bengaluru — Whitefield', department: 'Engineering', priority: 'Medium', assignedIC: PANEL_CORE, summary: 'Complaint of repeated unwelcome personal remarks during team stand-ups.' },
  { id: 'POSH-2026-0157', stage: 'registered', daysElapsed: 8, incidentLag: 11, complainant: { name: 'Aarti Deshmukh', gender: 'female', designation: 'Account Director' }, respondent: { name: 'Manish Oberoi', gender: 'male', designation: 'Regional Sales Head' }, location: 'Mumbai — Andheri East', department: 'Sales', priority: 'High', assignedIC: PANEL_FULL, summary: 'Complaint alleging unwelcome conduct at an offsite client event.' },
  { id: 'POSH-2026-0156', stage: 'notice_served', daysElapsed: 12, incidentLag: 20, complainant: { name: 'Ishaan Bhatt', gender: 'male', designation: 'Support Specialist' }, respondent: { name: 'Rohit Kaushik', gender: 'male', designation: 'Team Lead' }, location: 'Pune — Hinjawadi', department: 'Customer Success', priority: 'Medium', assignedIC: PANEL_CORE, summary: 'Complaint of persistent inappropriate messaging outside working hours.' },
  { id: 'POSH-2026-0155', stage: 'notice_served', daysElapsed: 19, incidentLag: 9, complainant: { name: 'Nandini Ghosh', gender: 'female', designation: 'Finance Manager' }, respondent: { name: 'Suresh Iyengar', gender: 'male', designation: 'Finance Controller' }, location: 'Kolkata — Salt Lake', department: 'Finance', priority: 'High', assignedIC: PANEL_FULL, conciliationRequested: true, summary: 'Complaint of conduct creating a hostile working environment; conciliation requested under s.10.' },
  { id: 'POSH-2026-0154', stage: 'report_pending', daysElapsed: 63, incidentLag: 14, inquiryTookDays: 58, complainant: { name: 'Pooja Grewal', gender: 'female', designation: 'Operations Lead' }, respondent: { name: 'Aditya Saxena', gender: 'male', designation: 'Operations Director' }, location: 'Gurugram — Cyber City', department: 'Operations', priority: 'Medium', assignedIC: PANEL_FULL, summary: 'Inquiry concluded; committee report being finalised for the employer.' },
  { id: 'POSH-2026-0153', stage: 'report_pending', daysElapsed: 71, incidentLag: 22, inquiryTookDays: 66, complainant: { name: 'Tara Bhattacharya', gender: 'female', designation: 'Legal Counsel' }, respondent: { name: 'Yash Chandra', gender: 'male', designation: 'Senior Counsel' }, location: 'Chennai — Taramani', department: 'Legal', priority: 'Medium', assignedIC: PANEL_WIDE, summary: 'Inquiry concluded; findings under review before submission.' },
  { id: 'POSH-2026-0152', stage: 'employer_action', daysElapsed: 88, incidentLag: 12, inquiryTookDays: 74, complainant: { name: 'Lakshmi Nandan', gender: 'female', designation: 'Brand Manager' }, respondent: { name: 'Varun Malhotra', gender: 'male', designation: 'Marketing Director' }, location: 'Bengaluru — Whitefield', department: 'Marketing', priority: 'Medium', assignedIC: PANEL_FULL, summary: 'Recommendation issued; employer action pending within the 60-day window.' },
  { id: 'POSH-2026-0151', stage: 'employer_action', daysElapsed: 104, incidentLag: 18, inquiryTookDays: 81, complainant: { name: 'Sneha Kulkarni', gender: 'female', designation: 'Product Manager' }, respondent: { name: 'Imran Sheikh', gender: 'male', designation: 'Group Product Manager' }, location: 'Hyderabad — Gachibowli', department: 'Engineering', priority: 'High', assignedIC: PANEL_WIDE, summary: 'Recommendation issued; disciplinary action under consideration.' },
  { id: 'POSH-2026-0150', stage: 'appeal_window', daysElapsed: 132, incidentLag: 25, inquiryTookDays: 79, complainant: { name: 'Divya Rangan', gender: 'female', designation: 'Treasury Analyst' }, respondent: { name: 'Alok Trivedi', gender: 'male', designation: 'Treasury Head' }, location: 'Hyderabad — Gachibowli', department: 'Finance', priority: 'Low', assignedIC: PANEL_CORE, summary: 'Action taken; the s.18 appeal window remains open.' },

  /* --- 3 awaiting respondent reply ------------------------------------ */
  { id: 'POSH-2026-0149', stage: 'awaiting_reply', daysElapsed: 14, incidentLag: 7, complainant: { name: 'Meher Contractor', gender: 'transgender', designation: 'UX Researcher' }, respondent: { name: 'Nikhil Barua', gender: 'male', designation: 'Design Lead' }, location: 'Gurugram — Cyber City', department: 'Marketing', priority: 'High', assignedIC: PANEL_FULL, summary: 'Complaint of discriminatory and unwelcome conduct; notice served, reply awaited.' },
  { id: 'POSH-2026-0148', stage: 'awaiting_reply', daysElapsed: 21, incidentLag: 16, complainant: { name: 'Kavya Menon', gender: 'female', designation: 'Financial Analyst' }, respondent: { name: 'Harish Bhatia', gender: 'male', designation: 'Vice President, Finance' }, location: 'Pune — Hinjawadi', department: 'Finance', priority: 'High', assignedIC: PANEL_WIDE, summary: 'Complaint of quid pro quo conduct linked to appraisal outcomes.' },
  { id: 'POSH-2026-0147', stage: 'awaiting_reply', daysElapsed: 27, incidentLag: 30, complainant: { name: 'Simran Kohli', gender: 'female', designation: 'Logistics Coordinator' }, respondent: { name: 'Naveen Acharya', gender: 'male', designation: 'Warehouse Manager' }, location: 'Delhi — Nehru Place', department: 'Operations', priority: 'Medium', assignedIC: PANEL_CORE, summary: 'Complaint of repeated unwelcome physical proximity at the despatch floor.' },

  /* --- 4 in active inquiry -------------------------------------------- */
  { id: 'POSH-2026-0146', stage: 'inquiry', daysElapsed: 34, incidentLag: 13, complainant: { name: 'Ishita Verma', gender: 'female', designation: 'HR Generalist' }, respondent: { name: 'Rohan Kapadia', gender: 'male', designation: 'HR Manager' }, location: 'Pune — Hinjawadi', department: 'Human Resources', priority: 'Medium', assignedIC: PANEL_FULL, summary: 'Inquiry under way; depositions being recorded.' },
  { id: 'POSH-2026-0145', stage: 'inquiry', daysElapsed: 45, incidentLag: 21, complainant: { name: 'Anonymous — withheld', gender: 'undisclosed', designation: 'Not disclosed' }, respondent: { name: 'Sanjay Pandit', gender: 'male', designation: 'Shift Supervisor' }, location: 'Chennai — Taramani', department: 'Operations', priority: 'High', assignedIC: PANEL_WIDE, summary: 'Complaint filed with identity withheld from the workplace at the complainant’s request.' },
  { id: 'POSH-2026-0144', stage: 'inquiry', daysElapsed: 52, incidentLag: 11, complainant: { name: 'Ritika Shah', gender: 'female', designation: 'Communications Lead' }, respondent: { name: 'Gautam Sundaram', gender: 'male', designation: 'Chief of Staff' }, location: 'Mumbai — Andheri East', department: 'Marketing', priority: 'High', assignedIC: PANEL_WIDE, summary: 'Inquiry under way; witness examination scheduled.' },
  { id: 'POSH-2026-0143', stage: 'inquiry', daysElapsed: 61, incidentLag: 17, complainant: { name: 'Juhi Mansoor', gender: 'female', designation: 'Data Scientist' }, respondent: { name: 'Prakash Naidu', gender: 'male', designation: 'Director, Analytics' }, location: 'Bengaluru — Whitefield', department: 'Engineering', priority: 'Medium', assignedIC: PANEL_FULL, summary: 'Inquiry under way; documentary evidence under review.' },

  /* --- 2 approaching breach ------------------------------------------- */
  // FLAGSHIP DEMO CASE — Day 84 of the 90-day inquiry window.
  { id: 'POSH-2026-0142', stage: 'inquiry', daysElapsed: 84, incidentLag: 15, complainant: { name: 'Ananya Pillai', gender: 'female', designation: 'Senior Engineer' }, respondent: { name: 'Gaurav Sethi', gender: 'male', designation: 'Principal Engineer' }, location: 'Bengaluru — Whitefield', department: 'Engineering', priority: 'High', assignedIC: PANEL_WIDE, summary: 'Complaint of sustained unwelcome conduct and retaliation following refusal. Inquiry in final stage.' },
  { id: 'POSH-2026-0141', stage: 'inquiry', daysElapsed: 78, incidentLag: 24, complainant: { name: 'Vandana Sinha', gender: 'female', designation: 'Procurement Lead' }, respondent: { name: 'Karthik Subban', gender: 'male', designation: 'Category Head' }, location: 'Delhi — Nehru Place', department: 'Operations', priority: 'High', assignedIC: PANEL_FULL, summary: 'Inquiry in final stage; closing submissions pending.' },

  /* --- 1 breached ------------------------------------------------------ */
  { id: 'POSH-2026-0139', stage: 'inquiry', daysElapsed: 96, incidentLag: 19, complainant: { name: 'Meera Joshi', gender: 'female', designation: 'QA Lead' }, respondent: { name: 'Sandeep Raghavan', gender: 'male', designation: 'Director, Quality' }, location: 'Bengaluru — Whitefield', department: 'Engineering', priority: 'High', assignedIC: PANEL_WIDE, breachReason: 'External Member unavailable for six weeks following medical leave; quorum under s.4(3) could not be constituted for three scheduled sittings. Extension recorded and reported to the District Officer.', summary: 'Inquiry exceeded the 90-day statutory window. Reportable under Rule 8(5).' },

  /* --- 5 closed (3 closed, 2 archived) --------------------------------- */
  { id: 'POSH-2026-0138', stage: 'closed', daysElapsed: 168, incidentLag: 20, inquiryTookDays: 63, complainant: { name: 'Aisha Rahman', gender: 'female', designation: 'Campaign Manager' }, respondent: { name: 'Jatin Chaudhary', gender: 'male', designation: 'Creative Director' }, location: 'Gurugram — Cyber City', department: 'Marketing', priority: 'Medium', assignedIC: PANEL_FULL, summary: 'Allegation upheld in part; written apology and reassignment directed.' },
  { id: 'POSH-2026-0137', stage: 'closed', daysElapsed: 214, incidentLag: 12, inquiryTookDays: 58, complainant: { name: 'Gayatri Nambiar', gender: 'female', designation: 'Site Reliability Engineer' }, respondent: { name: 'Rakesh Punjabi', gender: 'male', designation: 'Infrastructure Lead' }, location: 'Pune — Hinjawadi', department: 'Engineering', priority: 'Low', assignedIC: PANEL_CORE, summary: 'Allegation not substantiated; no action recommended against either party.' },
  { id: 'POSH-2026-0136', stage: 'closed', daysElapsed: 256, incidentLag: 28, inquiryTookDays: 71, complainant: { name: 'Charu Vaidya', gender: 'female', designation: 'Recruiter' }, respondent: { name: 'Mohit Khurana', gender: 'male', designation: 'Talent Acquisition Head' }, location: 'Delhi — Nehru Place', department: 'Human Resources', priority: 'Medium', assignedIC: PANEL_FULL, summary: 'Allegation upheld; withholding of increment and mandatory counselling directed.' },
  { id: 'POSH-2026-0135', stage: 'archived', daysElapsed: 322, incidentLag: 15, inquiryTookDays: 69, complainant: { name: 'Preeti Sundaram', gender: 'female', designation: 'Payroll Specialist' }, respondent: { name: 'Anil Deshpande', gender: 'male', designation: 'Payroll Manager' }, location: 'Chennai — Taramani', department: 'Human Resources', priority: 'Low', assignedIC: PANEL_CORE, summary: 'Closed and archived under the seven-year retention policy.' },
  { id: 'POSH-2026-0134', stage: 'archived', daysElapsed: 398, incidentLag: 33, inquiryTookDays: 74, complainant: { name: 'Bhavna Rathore', gender: 'female', designation: 'Compliance Officer' }, respondent: { name: 'Siddharth Roy', gender: 'male', designation: 'Risk Head' }, location: 'Mumbai — Andheri East', department: 'Legal', priority: 'Medium', assignedIC: PANEL_WIDE, summary: 'Closed and archived; handover pack issued to the district authority.' },
]

/* ------------------------------------------------------------------ *
 * Factory
 * ------------------------------------------------------------------ */

function buildParty(
  seed: PartySeed,
  role: 'complainant' | 'respondent',
  caseId: string,
  department: string,
  location: string,
): Party {
  return {
    id: `${caseId}-${role}`,
    // The masked label is fixed by role, never derived from the actual name.
    maskedName: role === 'complainant' ? 'Complainant A' : 'Respondent B',
    actualName: seed.name,
    gender: seed.gender,
    department,
    location,
    role,
    designation: seed.designation,
  }
}

function buildCase(seed: CaseSeed): Case {
  const filedDate = dateNDaysAgo(seed.daysElapsed)
  const incidentDate = dateNDaysAgo(seed.daysElapsed + seed.incidentLag)

  const noticeDue = noticeDeadline(filedDate)
  // Notice goes out promptly on cases that have moved past registration.
  const noticeServedOn = reached(seed.stage, 'notice_served')
    ? dateNDaysAgo(seed.daysElapsed - 4)
    : null

  const replyDue = noticeServedOn ? replyDeadline(noticeServedOn) : noticeDue
  const replyReceivedOn =
    noticeServedOn && reached(seed.stage, 'inquiry') ? dateNDaysAgo(seed.daysElapsed - 16) : null

  const inquiryDue = inquiryDeadline(filedDate)
  const inquiryCompletedOn =
    seed.inquiryTookDays !== undefined
      ? dateNDaysAgo(seed.daysElapsed - seed.inquiryTookDays)
      : null

  const reportDue = inquiryCompletedOn ? reportDeadline(inquiryCompletedOn) : null
  const reportSubmittedOn =
    inquiryCompletedOn && reached(seed.stage, 'employer_action')
      ? dateNDaysAgo(seed.daysElapsed - seed.inquiryTookDays! - 8)
      : null

  const actionDue = reportSubmittedOn ? employerActionDeadline(reportSubmittedOn) : null
  const actionTakenOn =
    reportSubmittedOn && reached(seed.stage, 'appeal_window')
      ? dateNDaysAgo(seed.daysElapsed - seed.inquiryTookDays! - 40)
      : null

  const appealWindowEnds = reportSubmittedOn ? appealWindowEnd(reportSubmittedOn) : null

  // Once the inquiry has concluded the 90-day clock has stopped; breach is judged on
  // when it actually finished, not on today's date.
  const isBreached = inquiryCompletedOn
    ? seed.inquiryTookDays! > 90
    : daysUntil(inquiryDue) < 0

  const daysRemaining = inquiryCompletedOn
    ? 90 - seed.inquiryTookDays!
    : daysUntil(inquiryDue)

  return {
    id: seed.id,
    stage: seed.stage,
    filedDate,
    incidentDate,
    complainant: buildParty(seed.complainant, 'complainant', seed.id, seed.department, seed.location),
    respondent: buildParty(seed.respondent, 'respondent', seed.id, seed.department, seed.location),
    assignedIC: seed.assignedIC,
    location: seed.location,
    department: seed.department,
    priority: seed.priority,
    milestones: {
      noticeDue,
      noticeServedOn,
      replyDue,
      replyReceivedOn,
      inquiryDue,
      inquiryCompletedOn,
      reportDue,
      reportSubmittedOn,
      actionDue,
      actionTakenOn,
      appealWindowEnds,
    },
    daysElapsed: seed.daysElapsed,
    daysRemaining,
    isBreached,
    breachReason: seed.breachReason ?? null,
    conciliationRequested: seed.conciliationRequested ?? false,
    summary: seed.summary,
  }
}

export const CASES: Case[] = SEEDS.map(buildCase)

export const FLAGSHIP_CASE_ID = 'POSH-2026-0142'

const BY_ID = new Map(CASES.map((c) => [c.id, c]))

export function caseById(id: string | undefined): Case | undefined {
  return id ? BY_ID.get(id) : undefined
}

/** Terminal stages — the case is no longer running a statutory clock. */
export const TERMINAL_STAGES: CaseStage[] = ['closed', 'archived']

export const isTerminal = (c: Case) => TERMINAL_STAGES.includes(c.stage)
export const isOpenCase = (c: Case) => !isTerminal(c)

export const OPEN_CASES = CASES.filter(isOpenCase)
export const CLOSED_CASES = CASES.filter(isTerminal)

export const LOCATIONS = [...new Set(CASES.map((c) => c.location))].sort()
export const DEPARTMENTS = [...new Set(CASES.map((c) => c.department))].sort()

/**
 * True while the s.11(4) inquiry clock is still running. Once the inquiry concludes the
 * clock stops, so "days left" is meaningless for report/action/appeal/closed stages —
 * showing a number there would imply a deadline that no longer applies.
 */
const LIVE_CLOCK_STAGES: CaseStage[] = ['registered', 'notice_served', 'awaiting_reply', 'inquiry']
export const hasLiveInquiryClock = (c: Case) => LIVE_CLOCK_STAGES.includes(c.stage)

/** Days the inquiry actually took, for cases where it has concluded. */
export function daysToClosure(c: Case): number | null {
  const done = c.milestones.inquiryCompletedOn
  if (!done) return null
  return differenceInCalendarDays(parseISO(done), parseISO(c.filedDate))
}

/** Mean inquiry duration across concluded cases — the "average days to closure" figure. */
export function averageDaysToClosure(): number {
  const durations = CASES.map(daysToClosure).filter((d): d is number => d !== null)
  if (!durations.length) return 0
  return Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
}
