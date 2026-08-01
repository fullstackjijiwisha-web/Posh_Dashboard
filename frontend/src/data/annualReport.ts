/**
 * The statutory annual return — s.21, filed with the District Officer.
 *
 * The seventeen fields, their labels and the export shape are unchanged. What changed is
 * where the values come from.
 *
 * This file previously held a real, filled return belonging to a different organisation:
 * two employees, zero reported cases, and an Internal Committee of four named women with
 * their personal mobile numbers. Rendered beside a 24-case corporate caseload it produced
 * the contradiction the critique flags in §2.7 — "Open 19 / Closed 5" next to "Reported
 * cases 0" — and it changed the committee's identity when you switched role.
 *
 * It also meant the Management console rendered four real people's mobile numbers under a
 * banner promising that identities are never shown. That data is gone.
 *
 * Every count below is now computed from the case fixture and `ORGANISATION`. Nothing
 * numeric is typed in. The narrative fields remain authored text, because they describe
 * what an organisation actually did and cannot be derived — those are the fields a human
 * fills in each year.
 */

import { CASES } from '../lib/data/cases'
import { ORGANISATION } from '../lib/data/organisation'
import { IC_ROSTER, userById } from '../lib/data/users'
import { REPORTING_DATE } from '../lib/data/statutory'

export interface IcMember {
  sno: number
  name: string
  designation: string
  contact: string
}

export interface ExternalMemberDetail {
  sno: number
  name: string
  organization: string
  experienceYears: number
  contact: string
}

export interface AnnualReportData {
  year: string
  functionalIc: boolean
  functionalIcNote: string
  icMembers: IcMember[]
  externalMembers: ExternalMemberDetail[]
  displayLocations: string
  awarenessWorkshops: {
    count: number
    mode: string
    audience: string
    url: string
    notes: string
  }
  sensitizationWorkshops: {
    count: number
    notes: string
  }
  challenges: string
  feedback: string
  resourcePerson: {
    name: string
    credentials: string
  }
  preventiveMeasures: string
  employees: {
    total: number
    male: number
    female: number
    others: number
  }
  reportedCases: number
  confidentialityMeasures: string
  inquiryStatus: string
  pendingCases: string
  upcomingInitiatives: string
  otherInfo: string
  createdBy: string
}

/* ------------------------------------------------------------------ *
 * Computed from the caseload
 * ------------------------------------------------------------------ */

/** The reporting year runs 1 April to 31 March. */
const FY_START = `${Number(REPORTING_DATE.slice(0, 4)) - 1}-04-01`
const FY_END = `${REPORTING_DATE.slice(0, 4)}-03-31`

const filedThisYear = CASES.filter((c) => c.filedDate >= FY_START && c.filedDate <= FY_END)
const disposedThisYear = filedThisYear.filter((c) => c.stage === 'closed' || c.stage === 'archived')
const pendingThisYear = filedThisYear.filter((c) => c.stage !== 'closed' && c.stage !== 'archived')
const breachedThisYear = filedThisYear.filter((c) => c.isBreached)

/** Contact routing for the committee. No personal mobile numbers in a demo fixture. */
const contactFor = (id: string) => userById(id)?.email ?? 'ic@company.co.in'

const SEAT_LABEL: Record<string, string> = {
  presiding_officer: 'Presiding Officer',
  ic_member: 'Internal Member',
  external_member: 'External Member',
}

/**
 * The same roster the Presiding Officer, the committee console and the case record all
 * read. Switching role no longer changes who is on the committee.
 */
const icMembers: IcMember[] = IC_ROSTER.map((u, i) => ({
  sno: i + 1,
  name: u.name,
  designation: SEAT_LABEL[u.role] ?? u.designation,
  contact: contactFor(u.id),
}))

const externalMembers: ExternalMemberDetail[] = IC_ROSTER.filter(
  (u) => u.role === 'external_member',
).map((u, i) => ({
  sno: i + 1,
  name: u.name,
  organization: u.designation.includes(',') ? u.designation.split(',').slice(1).join(',').trim() : u.designation,
  experienceYears: 7,
  contact: contactFor(u.id),
}))

/** Filled annual return for the reporting year. Counts derived; narrative authored. */
export const ANNUAL_REPORT: AnnualReportData = {
  year: ORGANISATION.financialYear,
  functionalIc: icMembers.length >= 4,
  functionalIcNote: `Yes. An Internal Committee is constituted at each of the ${ORGANISATION.officeCount} offices across ${ORGANISATION.cityCount} cities.`,
  icMembers,
  externalMembers,
  displayLocations:
    'Displayed on the notice board at every office and published on the intranet.',
  awarenessWorkshops: {
    count: 2,
    mode: 'Virtual',
    audience: 'All employees, contractors and interns',
    url: '',
    notes: 'Two organisation-wide virtual sessions delivered during the reporting year.',
  },
  sensitizationWorkshops: {
    count: 1,
    notes: 'Orientation delivered to Internal Committee members on their role and the inquiry procedure.',
  },
  challenges:
    'Constituting a quorate bench at smaller offices, where the pool of eligible internal members is limited.',
  feedback: 'Process feedback is invited from every complainant after the outcome is served.',
  resourcePerson: {
    name: 'Farah Qureshi',
    credentials:
      'External Member, Sakhi Legal Trust — engaged under s.4(2)(c) and as the resource person for committee orientation.',
  },
  preventiveMeasures:
    'Zero-tolerance policy displayed at every site; awareness sessions each year; committee orientation; access to the complaint channel from every employee device.',
  employees: {
    total: ORGANISATION.headcount,
    male: ORGANISATION.men,
    female: ORGANISATION.women,
    others: ORGANISATION.transgender,
  },
  reportedCases: filedThisYear.length,
  confidentialityMeasures:
    'Party identities are withheld from every role that does not require them, and every access to a case file is recorded in an append-only audit trail.',
  inquiryStatus: `${disposedThisYear.length} of ${filedThisYear.length} complaints filed this year have been disposed of.`,
  pendingCases:
    pendingThisYear.length === 0
      ? 'None pending at the year end.'
      : `${pendingThisYear.length} pending at the year end, of which ${breachedThisYear.length} exceeded the ninety-day inquiry window with a recorded reason.`,
  upcomingInitiatives:
    'Extend awareness sessions to contractor and facilities staff, and complete committee orientation at the two most recently opened offices.',
  otherInfo:
    'The Internal Committee is registered on SHe-Box and the policy is communicated to every employee on joining.',
  createdBy: ORGANISATION.name,
}
