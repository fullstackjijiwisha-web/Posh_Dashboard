/**
 * Cross-view consistency checks.
 *
 * The application's worst bug was not a crash: it was that the Presiding Officer and the
 * Management console described different companies, with different Internal Committees
 * and different headcounts. Nothing failed, so nothing surfaced it — you had to switch
 * role and notice.
 *
 * These assertions encode the invariants that were broken, so the same class of drift
 * fails loudly instead. They run as a Vitest suite, and `assertConsistency()` also runs
 * in dev at startup so a fixture edit that breaks an invariant is visible immediately
 * rather than at the next demo.
 */

import { CASES } from './cases'
import { OFFICES, ORGANISATION, officeHeadcount } from './organisation'
import { IC_ROSTER } from './users'
import { BOARD_DISCLOSURE_YEARS, DEFAULT_BOARD_FY } from './boardDisclosure'
import { ANNUAL_REPORT } from '../../data/annualReport'
import { COMPLIANCE } from '../../data/mock'

export interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

export function runConsistencyChecks(): CheckResult[] {
  const results: CheckResult[] = []
  const check = (name: string, ok: boolean, detail: string) => results.push({ name, ok, detail })

  /* --- Headcount: the three figures that used to disagree --------------- */

  const officeSum = OFFICES.reduce((n, o) => n + officeHeadcount(o), 0)
  check(
    'Organisation headcount equals the sum of its offices',
    ORGANISATION.headcount === officeSum,
    `${ORGANISATION.headcount} vs ${officeSum}`,
  )

  check(
    'Gender split sums to the headcount',
    ORGANISATION.women + ORGANISATION.men + ORGANISATION.transgender === ORGANISATION.headcount,
    `${ORGANISATION.women}W + ${ORGANISATION.men}M + ${ORGANISATION.transgender}T = ${ORGANISATION.headcount}`,
  )

  check(
    'Compliance KPI headcount matches the organisation',
    COMPLIANCE.totalEmployees === ORGANISATION.headcount,
    `COMPLIANCE ${COMPLIANCE.totalEmployees} vs ORGANISATION ${ORGANISATION.headcount}`,
  )

  check(
    'Annual return headcount matches the organisation',
    ANNUAL_REPORT.employees.total === ORGANISATION.headcount,
    `return ${ANNUAL_REPORT.employees.total} vs ORGANISATION ${ORGANISATION.headcount}`,
  )

  const boardFy = BOARD_DISCLOSURE_YEARS.find((y) => y.id === DEFAULT_BOARD_FY)
  const boardTotal = boardFy?.workforce.find((w) => w.isTotal)?.number
  check(
    "Board's Report headcount matches the organisation",
    boardTotal === ORGANISATION.headcount,
    `Board's Report ${boardTotal} vs ORGANISATION ${ORGANISATION.headcount}`,
  )

  check(
    'Annual return gender split matches the organisation',
    ANNUAL_REPORT.employees.female === ORGANISATION.women &&
      ANNUAL_REPORT.employees.male === ORGANISATION.men &&
      ANNUAL_REPORT.employees.others === ORGANISATION.transgender,
    `return ${ANNUAL_REPORT.employees.female}W/${ANNUAL_REPORT.employees.male}M/${ANNUAL_REPORT.employees.others}T`,
  )

  /* --- The committee: same four people in every view -------------------- */

  const rosterNames = IC_ROSTER.map((u) => u.name).sort()
  const returnNames = ANNUAL_REPORT.icMembers.map((m) => m.name).sort()
  check(
    'Annual return IC roster matches the committee roster',
    rosterNames.length === returnNames.length && rosterNames.every((n, i) => n === returnNames[i]),
    `roster [${rosterNames.join(', ')}] vs return [${returnNames.join(', ')}]`,
  )

  check(
    'The committee has an external member',
    ANNUAL_REPORT.externalMembers.length >= 1,
    `${ANNUAL_REPORT.externalMembers.length} external member(s)`,
  )

  /* --- Confidentiality: no personal contact numbers in the fixture ------ */

  const phoneLike = /(\+91[\s-]?)?\b\d{10}\b|\b\d{5}[\s-]\d{5}\b/
  const withPhones = [...ANNUAL_REPORT.icMembers, ...ANNUAL_REPORT.externalMembers].filter((m) =>
    phoneLike.test(m.contact),
  )
  check(
    'No personal mobile numbers rendered on the annual return',
    withPhones.length === 0,
    withPhones.length ? `${withPhones.length} member(s) still carry a phone number` : 'none',
  )

  /* --- Cases: every aggregate traceable to the fixture ------------------ */

  check(
    "Board's Report source case count matches the fixture",
    boardFy?.sourceCaseCount === CASES.length,
    `sourceCaseCount ${boardFy?.sourceCaseCount} vs CASES ${CASES.length}`,
  )

  check(
    'Reported cases on the return is within the caseload',
    ANNUAL_REPORT.reportedCases <= CASES.length,
    `${ANNUAL_REPORT.reportedCases} reported of ${CASES.length} on the register`,
  )

  check(
    'Every case location is a known office',
    CASES.every((c) => OFFICES.some((o) => o.name === c.location)),
    CASES.filter((c) => !OFFICES.some((o) => o.name === c.location))
      .map((c) => `${c.id}:${c.location}`)
      .join(', ') || 'all match',
  )

  return results
}

/** Throws on the first broken invariant. Called in dev at startup. */
export function assertConsistency(): void {
  const failures = runConsistencyChecks().filter((r) => !r.ok)
  if (failures.length) {
    const lines = failures.map((f) => `  · ${f.name} — ${f.detail}`).join('\n')
    throw new Error(`Fixture consistency failed:\n${lines}`)
  }
}
