/**
 * The organisation. One of them.
 *
 * Before this file existed the application described three different companies at once:
 * `COMPLIANCE.totalEmployees` said 2,450, the Board's Report said 4,482, and the annual
 * return said 2 employees (1M/1F) because it held a real filled return for a different
 * organisation entirely. Switching role changed the company you were looking at.
 *
 * Everything about the establishment now comes from here, and every total is SUMMED from
 * the offices rather than written down beside them — a hand-typed total is exactly how
 * the three figures drifted apart in the first place.
 *
 * The anchor is the Board's Report disclosure for FY 2025–26 (4,482, with the gender
 * split it discloses), because that figure is already reconciled against the case
 * fixture: `boardDisclosure.sourceCaseCount` is 24 and `CASES.length` is 24. The other
 * two figures had nothing tying them to anything.
 */

/* ------------------------------------------------------------------ *
 * Offices
 * ------------------------------------------------------------------ */

export interface Office {
  id: string
  /** Must match the `location` strings on the case fixture exactly. */
  name: string
  city: string
  state: string
  /** Headcount by gender. The office total is derived, never stored. */
  women: number
  men: number
  transgender: number
  /** An Internal Committee is required at every office with 10 or more employees. */
  icConstituted: boolean
}

/**
 * Eight offices, not six.
 *
 * The critique describes "six offices across five cities". The case fixture references
 * eight distinct locations by name, and cases are joined to offices on that string — so
 * dropping two would orphan live case data. The fixture wins and the count is eight.
 * Flagged in the build log for a human to confirm which number is intended.
 */
export const OFFICES: Office[] = [
  { id: 'blr-wf', name: 'Bengaluru — Whitefield', city: 'Bengaluru', state: 'Karnataka', women: 512, men: 660, transgender: 8, icConstituted: true },
  { id: 'mum-ae', name: 'Mumbai — Andheri East', city: 'Mumbai', state: 'Maharashtra', women: 305, men: 430, transgender: 7, icConstituted: true },
  { id: 'pun-hj', name: 'Pune — Hinjawadi', city: 'Pune', state: 'Maharashtra', women: 268, men: 382, transgender: 6, icConstituted: true },
  { id: 'hyd-gb', name: 'Hyderabad — Gachibowli', city: 'Hyderabad', state: 'Telangana', women: 244, men: 339, transgender: 5, icConstituted: true },
  { id: 'ggn-cc', name: 'Gurugram — Cyber City', city: 'Gurugram', state: 'Haryana', women: 214, men: 293, transgender: 5, icConstituted: true },
  { id: 'del-np', name: 'Delhi — Nehru Place', city: 'Delhi', state: 'Delhi', women: 163, men: 231, transgender: 4, icConstituted: true },
  { id: 'chn-tm', name: 'Chennai — Taramani', city: 'Chennai', state: 'Tamil Nadu', women: 100, men: 146, transgender: 5, icConstituted: true },
  { id: 'kol-sl', name: 'Kolkata — Salt Lake', city: 'Kolkata', state: 'West Bengal', women: 41, men: 110, transgender: 4, icConstituted: true },
]

export const officeHeadcount = (o: Office) => o.women + o.men + o.transgender

export const officeByName = (name: string) => OFFICES.find((o) => o.name === name)

/* ------------------------------------------------------------------ *
 * The establishment, summed
 * ------------------------------------------------------------------ */

const sum = (pick: (o: Office) => number) => OFFICES.reduce((n, o) => n + pick(o), 0)

export const ORGANISATION = {
  name: 'Meridian Technologies Private Limited',
  cin: 'U72900KA2014PTC076231',
  registeredOffice: 'Bengaluru — Whitefield',
  /** The reporting year every statutory figure in the app is stated for. */
  financialYear: '2025–26',
  /** Every count below is derived from OFFICES. None is written down twice. */
  get women() { return sum((o) => o.women) },
  get men() { return sum((o) => o.men) },
  get transgender() { return sum((o) => o.transgender) },
  get headcount() { return sum(officeHeadcount) },
  get officeCount() { return OFFICES.length },
  get cityCount() { return new Set(OFFICES.map((o) => o.city)).size },
  get stateCount() { return new Set(OFFICES.map((o) => o.state)).size },
  get icsConstituted() { return OFFICES.filter((o) => o.icConstituted).length },
  /**
   * Share of the workforce that has completed awareness training this year — s.19(c).
   * The one establishment figure that is a stated fact rather than a derived one,
   * because it records what was actually delivered.
   */
  trainingCoveragePct: 94,
  get trainedEmployees() {
    return Math.round((this.headcount * this.trainingCoveragePct) / 100)
  },
} as const

/** Percentage of the workforce, to one decimal. */
export const pctOfWorkforce = (n: number) =>
  Number(((n / ORGANISATION.headcount) * 100).toFixed(1))
