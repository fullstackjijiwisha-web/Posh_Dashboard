/**
 * Board's Report disclosure figures — Rule 8(5), Companies (Accounts) Rules 2014
 * as amended by the Companies (Accounts) Second Amendment Rules 2025
 * (effective 14 July 2025).
 */

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
      { category: 'Women', number: 1847, pct: 41.2 },
      { category: 'Men', number: 2591, pct: 57.8 },
      { category: 'Transgender persons', number: 44, pct: 1.0 },
      { category: 'Total', number: 4482, pct: 100, isTotal: true },
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
