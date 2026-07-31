/**
 * The full case record — the single source of truth for the caseload.
 *
 * This file DOES carry identities, because the IC case inbox needs them. Access is
 * gated at render time by RoleContext (src/context/RoleContext.tsx), and the management
 * dashboard never reads this module directly: it consumes the de-identified projection
 * in data/management.ts, which strips identity fields at the type level.
 *
 * Dates are DERIVED, never hand-written. Authoring only `daysElapsed` (open) or
 * `filed` + `daysToClosure` (closed) makes the statutory invariants true by
 * construction rather than by arithmetic done in a comment:
 *     deadline      = filed + 90 days          (s.11(4))
 *     daysRemaining = 90 − daysElapsed
 *
 * Totals other screens depend on:
 *     13 open + 11 closed = 24 cases   (7 of the closed are archived)
 *     mean daysToClosure across closed cases = 67  → "Average days to closure"
 *     POSH-2026-0142 is the flagship demo case, at day 84 of the 90-day window
 */

import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import type { CaseStage } from './management'

/** The "as at" date every elapsed/remaining figure is computed against. */
export const REPORTING_DATE = '2026-07-31'

/** Statutory inquiry window under PoSH Act 2013, s.11(4). */
export const STATUTORY_WINDOW_DAYS = 90

const ISO = 'yyyy-MM-dd'
const asAt = parseISO(REPORTING_DATE)

export interface IcMember {
  id: string
  name: string
  initials: string
}

export type CasePriority = 'High' | 'Medium' | 'Low'
export type CaseStatus = 'Open' | 'Closed'

export interface CaseRecord {
  id: string
  status: CaseStatus
  /** Closed cases past retention review. Always implies status 'Closed'. */
  archived: boolean
  stage: CaseStage | 'Closed'
  /** Real identities. Never render without consulting RoleContext. */
  complainant: string
  respondent: string
  filed: string
  /** Days from filing to today (open) or to closure (closed). */
  daysElapsed: number
  /** Statutory inquiry deadline — filed + 90 days. */
  deadline: string
  /** Days left to the deadline. `null` once closed — the clock has stopped. */
  daysRemaining: number | null
  closedOn: string | null
  location: string
  department: string
  assignedIc: IcMember[]
  priority: CasePriority
}

const IC = {
  ps: { id: 'ic-ps', name: 'Priya Sharma', initials: 'PS' },
  rk: { id: 'ic-rk', name: 'Rajesh Kumar', initials: 'RK' },
  ad: { id: 'ic-ad', name: 'Anita Desai', initials: 'AD' },
  vm: { id: 'ic-vm', name: 'Vikram Mehta', initials: 'VM' },
  sk: { id: 'ic-sk', name: 'Saanya Kapoor', initials: 'SK' },
  ni: { id: 'ic-ni', name: 'Neha Iyer', initials: 'NI' },
  an: { id: 'ic-an', name: 'Arjun Nair', initials: 'AN' },
  fq: { id: 'ic-fq', name: 'Farah Qureshi', initials: 'FQ' },
  dr: { id: 'ic-dr', name: 'Deepak Rao', initials: 'DR' },
} satisfies Record<string, IcMember>

/* ------------------------------------------------------------------ *
 * Open cases — authored by age, ordered oldest first
 * ------------------------------------------------------------------ */

interface OpenSeed {
  id: string
  daysElapsed: number
  stage: CaseStage
  complainant: string
  respondent: string
  location: string
  department: string
  assignedIc: IcMember[]
  priority: CasePriority
}

const OPEN_SEED: OpenSeed[] = [
  { id: 'POSH-2026-0139', daysElapsed: 97, stage: 'Proceedings',     complainant: 'Meera Joshi',       respondent: 'Sandeep Raghavan', location: 'Bengaluru — Whitefield',  department: 'Engineering', assignedIc: [IC.ps, IC.rk, IC.ad, IC.vm, IC.ni], priority: 'High' },
  { id: 'POSH-2026-0140', daysElapsed: 87, stage: 'Report',          complainant: 'Kavya Menon',       respondent: 'Harish Bhatia',    location: 'Pune — Hinjawadi',        department: 'Finance',     assignedIc: [IC.ad, IC.vm, IC.sk, IC.an], priority: 'High' },
  // Held at 80 days so exactly two open cases sit inside the 7-day danger window
  // (0140 and the flagship 0142), alongside the single breached case 0139.
  { id: 'POSH-2026-0141', daysElapsed: 80, stage: 'Management',      complainant: 'Ritika Shah',       respondent: 'Nikhil Barua',     location: 'Gurugram — Cyber City',   department: 'Marketing',   assignedIc: [IC.ps, IC.ni, IC.fq], priority: 'High' },
  // Flagship demo case: day 84 of the 90-day inquiry window.
  { id: 'POSH-2026-0142', daysElapsed: 84, stage: 'Evidence',        complainant: 'Ananya Pillai',     respondent: 'Gaurav Sethi',     location: 'Bengaluru — Whitefield',  department: 'Engineering', assignedIc: [IC.rk, IC.an], priority: 'High' },
  { id: 'POSH-2026-0143', daysElapsed: 78, stage: 'Proceedings',     complainant: 'Sneha Kulkarni',    respondent: 'Imran Sheikh',     location: 'Mumbai — Andheri East',   department: 'Operations',  assignedIc: [IC.ad, IC.sk, IC.dr, IC.ps], priority: 'Medium' },
  { id: 'POSH-2026-0144', daysElapsed: 72, stage: 'Committee',       complainant: 'Divya Rangan',      respondent: 'Alok Trivedi',     location: 'Hyderabad — Gachibowli',  department: 'Finance',     assignedIc: [IC.vm, IC.fq], priority: 'Medium' },
  { id: 'POSH-2026-0145', daysElapsed: 68, stage: 'Evidence',        complainant: 'Tara Bhattacharya', respondent: 'Yash Chandra',     location: 'Chennai — Taramani',      department: 'Legal',       assignedIc: [IC.ps, IC.rk, IC.dr], priority: 'Medium' },
  { id: 'POSH-2026-0146', daysElapsed: 64, stage: 'Report',          complainant: 'Ishita Verma',      respondent: 'Rohan Kapadia',    location: 'Pune — Hinjawadi',        department: 'Human Resources', assignedIc: [IC.ni, IC.an, IC.sk, IC.ad, IC.vm], priority: 'Medium' },
  { id: 'POSH-2026-0147', daysElapsed: 61, stage: 'Proceedings',     complainant: 'Lakshmi Nandan',    respondent: 'Varun Malhotra',   location: 'Bengaluru — Whitefield',  department: 'Marketing',   assignedIc: [IC.fq, IC.dr], priority: 'Medium' },
  { id: 'POSH-2026-0148', daysElapsed: 55, stage: 'Evidence',        complainant: 'Pooja Grewal',      respondent: 'Aditya Saxena',    location: 'Gurugram — Cyber City',   department: 'Operations',  assignedIc: [IC.ps, IC.ad, IC.ni, IC.an], priority: 'Low' },
  { id: 'POSH-2026-0149', daysElapsed: 41, stage: 'Proceedings',     complainant: 'Nandini Ghosh',     respondent: 'Suresh Iyengar',   location: 'Mumbai — Andheri East',   department: 'Engineering', assignedIc: [IC.rk, IC.sk], priority: 'Low' },
  { id: 'POSH-2026-0150', daysElapsed: 26, stage: 'Committee',       complainant: 'Aarti Deshmukh',    respondent: 'Manish Oberoi',    location: 'Chennai — Taramani',      department: 'Legal',       assignedIc: [IC.vm, IC.dr, IC.fq], priority: 'Low' },
  { id: 'POSH-2026-0151', daysElapsed: 12, stage: 'Acknowledgement', complainant: 'Rhea Sequeira',     respondent: 'Kabir Ahluwalia',  location: 'Bengaluru — Whitefield',  department: 'Human Resources', assignedIc: [IC.an], priority: 'Low' },
]

const OPEN: CaseRecord[] = OPEN_SEED.map((seed) => {
  const filed = subDays(asAt, seed.daysElapsed)
  return {
    ...seed,
    status: 'Open',
    archived: false,
    filed: format(filed, ISO),
    deadline: format(addDays(filed, STATUTORY_WINDOW_DAYS), ISO),
    daysRemaining: STATUTORY_WINDOW_DAYS - seed.daysElapsed,
    closedOn: null,
  }
})

/* ------------------------------------------------------------------ *
 * Closed cases — filings spread across the trailing 14 months
 * ------------------------------------------------------------------ */

interface ClosedSeed {
  id: string
  filed: string
  daysToClosure: number
  archived: boolean
  complainant: string
  respondent: string
  location: string
  department: string
  assignedIc: IcMember[]
  priority: CasePriority
}

/** daysToClosure averages exactly 67 — the figure the dashboard reports. */
const CLOSED_SEED: ClosedSeed[] = [
  { id: 'POSH-2026-0128', filed: '2025-06-12', daysToClosure: 79, archived: true,  complainant: 'Shalini Prasad',  respondent: 'Dev Anand Rao',   location: 'Bengaluru — Whitefield', department: 'Engineering',     assignedIc: [IC.ps, IC.rk, IC.ad], priority: 'High' },
  { id: 'POSH-2026-0129', filed: '2025-07-21', daysToClosure: 78, archived: true,  complainant: 'Juhi Mansoor',    respondent: 'Prakash Naidu',   location: 'Pune — Hinjawadi',       department: 'Finance',         assignedIc: [IC.vm, IC.sk], priority: 'Medium' },
  { id: 'POSH-2026-0130', filed: '2025-08-28', daysToClosure: 74, archived: true,  complainant: 'Reema Fernandes', respondent: 'Tarun Bakshi',    location: 'Mumbai — Andheri East',  department: 'Operations',      assignedIc: [IC.ni, IC.an, IC.fq, IC.dr], priority: 'Medium' },
  { id: 'POSH-2026-0131', filed: '2025-09-16', daysToClosure: 71, archived: true,  complainant: 'Bhavna Rathore',  respondent: 'Siddharth Roy',   location: 'Chennai — Taramani',     department: 'Legal',           assignedIc: [IC.ps, IC.dr], priority: 'High' },
  { id: 'POSH-2026-0132', filed: '2025-10-09', daysToClosure: 69, archived: true,  complainant: 'Charu Vaidya',    respondent: 'Mohit Khurana',   location: 'Gurugram — Cyber City',  department: 'Marketing',       assignedIc: [IC.ad, IC.vm, IC.ni], priority: 'Low' },
  { id: 'POSH-2026-0133', filed: '2025-11-04', daysToClosure: 67, archived: true,  complainant: 'Nisha Chopra',    respondent: 'Vivek Ramanathan', location: 'Hyderabad — Gachibowli', department: 'Finance',        assignedIc: [IC.rk, IC.fq], priority: 'Medium' },
  { id: 'POSH-2026-0134', filed: '2025-11-27', daysToClosure: 65, archived: true,  complainant: 'Preeti Sundaram', respondent: 'Anil Deshpande',  location: 'Bengaluru — Whitefield', department: 'Human Resources', assignedIc: [IC.sk, IC.an, IC.ps, IC.dr], priority: 'Low' },
  { id: 'POSH-2026-0135', filed: '2025-12-18', daysToClosure: 63, archived: false, complainant: 'Gayatri Nambiar', respondent: 'Rakesh Punjabi',  location: 'Pune — Hinjawadi',       department: 'Engineering',     assignedIc: [IC.vm, IC.ni], priority: 'Medium' },
  { id: 'POSH-2026-0136', filed: '2026-01-14', daysToClosure: 61, archived: false, complainant: 'Simran Kohli',    respondent: 'Naveen Acharya',  location: 'Mumbai — Andheri East',  department: 'Operations',      assignedIc: [IC.ad, IC.fq, IC.rk], priority: 'Low' },
  { id: 'POSH-2026-0137', filed: '2026-02-05', daysToClosure: 58, archived: false, complainant: 'Vandana Sinha',   respondent: 'Karthik Subban',  location: 'Chennai — Taramani',     department: 'Legal',           assignedIc: [IC.ps, IC.sk], priority: 'Low' },
  { id: 'POSH-2026-0138', filed: '2026-03-03', daysToClosure: 52, archived: false, complainant: 'Aisha Rahman',    respondent: 'Jatin Chaudhary', location: 'Gurugram — Cyber City',  department: 'Marketing',       assignedIc: [IC.dr, IC.an, IC.vm], priority: 'Low' },
]

const CLOSED: CaseRecord[] = CLOSED_SEED.map((seed) => {
  const filed = parseISO(seed.filed)
  return {
    id: seed.id,
    status: 'Closed',
    archived: seed.archived,
    stage: 'Closed',
    complainant: seed.complainant,
    respondent: seed.respondent,
    filed: seed.filed,
    daysElapsed: seed.daysToClosure,
    deadline: format(addDays(filed, STATUTORY_WINDOW_DAYS), ISO),
    daysRemaining: null,
    closedOn: format(addDays(filed, seed.daysToClosure), ISO),
    location: seed.location,
    department: seed.department,
    assignedIc: seed.assignedIc,
    priority: seed.priority,
  }
})

export const ALL_CASES: CaseRecord[] = [...OPEN, ...CLOSED]

export const LOCATIONS = [...new Set(ALL_CASES.map((c) => c.location))].sort()

/** Days between filing and the reporting date — used by the workspace header. */
export function daysSinceFiling(iso: string) {
  return differenceInCalendarDays(asAt, parseISO(iso))
}

/* ------------------------------------------------------------------ *
 * Saved views
 * ------------------------------------------------------------------ */

export interface SavedView {
  key: string
  label: string
  /** Red count badge — reserved for the statutory-urgency view. */
  urgent?: boolean
  /** Filters the table. */
  predicate: (c: CaseRecord) => boolean
  /**
   * Counts the badge, when that differs from what the view lists. Only "Breaching
   * soon" uses this: the badge counts cases still *approaching* breach, because a case
   * that has already breached is no longer "soon", while the view lists those plus the
   * breached case — an overdue inquiry is the most urgent thing an IC member can open.
   */
  badgePredicate?: (c: CaseRecord) => boolean
}

const isOpen = (c: CaseRecord) => c.status === 'Open'

/**
 * Each view's count badge is derived from the very same predicate that filters the
 * table, so a badge can never disagree with the list it opens.
 *
 * "Breaching soon" uses the ≤7-day threshold that already drives the danger treatment
 * in the Days-left column, and includes cases that have already breached — an overdue
 * inquiry is the most urgent thing in the queue, not something to hide.
 */
export const SAVED_VIEWS: SavedView[] = [
  { key: 'open', label: 'All open', predicate: isOpen },
  {
    key: 'breaching',
    label: 'Breaching soon',
    urgent: true,
    predicate: (c) => isOpen(c) && c.daysRemaining !== null && c.daysRemaining <= 7,
    badgePredicate: (c) =>
      isOpen(c) && c.daysRemaining !== null && c.daysRemaining >= 0 && c.daysRemaining <= 7,
  },
  {
    key: 'awaiting',
    label: 'Awaiting respondent reply',
    predicate: (c) => isOpen(c) && (c.stage === 'Acknowledgement' || c.stage === 'Committee'),
  },
  { key: 'inquiry', label: 'In inquiry', predicate: (c) => isOpen(c) && c.stage === 'Proceedings' },
  { key: 'report', label: 'Ready for report', predicate: (c) => isOpen(c) && c.stage === 'Management' },
  { key: 'closed', label: 'Closed', predicate: (c) => c.status === 'Closed' },
  { key: 'archived', label: 'Archived', predicate: (c) => c.archived },
]

export function countFor(view: SavedView) {
  return ALL_CASES.filter(view.badgePredicate ?? view.predicate).length
}
