/**
 * Board's Report disclosure figures — Rule 8(5), Companies (Accounts) Rules 2014
 * as amended by the Companies (Accounts) Second Amendment Rules 2025
 * (effective 14 July 2025).
 *
 * The current year's workforce is derived from `ORGANISATION` rather than restated here.
 * These figures were already the most defensible in the app — `sourceCaseCount` matches
 * the case fixture — which is why they were chosen as the anchor when the three competing
 * headcounts were reconciled. Deriving them keeps that true rather than leaving it a
 * coincidence that has to be maintained by hand.
 *
 * The prior year stays as authored history: it is a filed disclosure about a workforce
 * that no longer exists, and nothing in the app should recompute it.
 */

import { ORGANISATION, pctOfWorkforce } from './organisation'

export interface BoardDisclosureFy {
  id: string
  label: string
  /** As-at date for gender composition. */
  asAt: string
  complaints: {
    received: number
    disposed: number
    pendingBeyond90: number
    pendingYearEnd: number
  }
  workforce: Array<{
    category: string
    number: number
    pct: number
    isTotal?: boolean
  }>
  confirmations: string[]
  sourceCaseCount: number
  generatedOn: string
}

export const BOARD_DISCLOSURE_YEARS: BoardDisclosureFy[] = [
  {
    id: '2025-26',
    label: 'FY 2025–26',
    asAt: '31 March 2026',
    complaints: {
      received: 14,
      disposed: 11,
      pendingBeyond90: 1,
      pendingYearEnd: 3,
    },
    workforce: [
      { category: 'Women', number: ORGANISATION.women, pct: pctOfWorkforce(ORGANISATION.women) },
      { category: 'Men', number: ORGANISATION.men, pct: pctOfWorkforce(ORGANISATION.men) },
      {
        category: 'Transgender persons',
        number: ORGANISATION.transgender,
        pct: pctOfWorkforce(ORGANISATION.transgender),
      },
      { category: 'Total', number: ORGANISATION.headcount, pct: 100, isTotal: true },
    ],
    confirmations: [
      'Internal Committee constituted in accordance with Section 4',
      'External member appointed',
      'Internal Committee registered on SHe-Box',
      'Annual report filed with District Officer under Section 21',
      'POSH policy published and communicated to all employees',
      'Awareness training conducted during the financial year',
    ],
    sourceCaseCount: 24,
    generatedOn: '31 July 2026',
  },
  {
    id: '2024-25',
    label: 'FY 2024–25',
    asAt: '31 March 2025',
    complaints: {
      received: 9,
      disposed: 8,
      pendingBeyond90: 0,
      pendingYearEnd: 1,
    },
    workforce: [
      { category: 'Women', number: 1712, pct: 40.1 },
      { category: 'Men', number: 2520, pct: 59.0 },
      { category: 'Transgender persons', number: 38, pct: 0.9 },
      { category: 'Total', number: 4270, pct: 100, isTotal: true },
    ],
    confirmations: [
      'Internal Committee constituted in accordance with Section 4',
      'External member appointed',
      'Internal Committee registered on SHe-Box',
      'Annual report filed with District Officer under Section 21',
      'POSH policy published and communicated to all employees',
      'Awareness training conducted during the financial year',
    ],
    sourceCaseCount: 18,
    generatedOn: '31 July 2026',
  },
]

export const DEFAULT_BOARD_FY = '2025-26'
