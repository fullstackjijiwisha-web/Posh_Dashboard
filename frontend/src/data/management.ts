/**
 * Anonymised dataset for the Management Dashboard (/dashboard).
 *
 * CONFIDENTIALITY CONTRACT — PoSH Act 2013, s.16 (prohibition of publication of
 * identity) read with Rule 12. Management reporting is an aggregate, de-identified
 * view: it must never carry the identity of the complainant, the respondent, any
 * witness, or any IC member.
 *
 * This is enforced structurally, not cosmetically. `ManagementCase` has NO name,
 * email, initials, avatar or free-text field. There is nothing on this shape that
 * could carry an identity, so no render path — and no future edit to the page —
 * can leak one. Parties are referenced only through the fixed labels in
 * `PARTY_LABELS`.
 *
 * Do not add a person-identifying field to these types. If management ever needs
 * named data, it belongs behind the case workspace and its access controls, not here.
 */

import { ALL_CASES, type CaseRecord } from './caseload'
import { COMPLIANCE } from './mock'

/** Fixed, non-identifying party references. The only party labels permitted here. */
export const PARTY_LABELS = {
  complainant: 'Complainant A',
  respondent: 'Respondent B',
} as const

/** Workflow stages an open case can sit in. Mirrors WORKFLOW_STAGES in mock.ts. */
export type CaseStage =
  | 'Acknowledgement'
  | 'Committee'
  | 'Proceedings'
  | 'Evidence'
  | 'Report'
  | 'Management'

export const CASE_STAGES: CaseStage[] = [
  'Acknowledgement',
  'Committee',
  'Proceedings',
  'Evidence',
  'Report',
  'Management',
]

/**
 * A single open case, de-identified.
 * Deliberately carries no complainant, respondent, assignee or IC member field.
 */
export interface ManagementCase {
  /** Case reference — the only identifier shown anywhere in management reporting. */
  id: string
  stage: CaseStage
  /** Date the complaint was filed (ISO). */
  filed: string
  /** Days since filing, as at REPORTING_DATE. */
  daysElapsed: number
  /** Statutory inquiry deadline (ISO) — filed + 90 days, PoSH Act s.11(4). */
  deadline: string
  /** Days left to the statutory deadline. Negative means the deadline has passed. */
  daysRemaining: number
  location: string
  department: string
}

/** Re-exported so consumers of the de-identified view need not reach into the
 *  identity-bearing module. Defined once, in data/caseload.ts. */
export { REPORTING_DATE, STATUTORY_WINDOW_DAYS } from './caseload'

/**
 * The 13 open cases, de-identified.
 *
 * THIS MAPPING IS THE ENFORCEMENT POINT. It names every field that survives into
 * management reporting; `complainant`, `respondent` and `assignedIc` are dropped here
 * and have no home on the `ManagementCase` shape to land in. Adding a field to the
 * source record does not leak it — it has to be added here deliberately, and the type
 * will reject it if it identifies anyone.
 *
 * Deriving rather than duplicating also means the dashboard and the IC case inbox
 * cannot drift apart. Every row satisfies:
 *   daysElapsed + daysRemaining === STATUTORY_WINDOW_DAYS
 *   deadline === filed + STATUTORY_WINDOW_DAYS
 */
export const OPEN_CASES: ManagementCase[] = ALL_CASES.filter(
  (c): c is CaseRecord & { daysRemaining: number } =>
    c.status === 'Open' && c.daysRemaining !== null,
).map((c) => ({
  id: c.id,
  stage: c.stage as CaseStage,
  filed: c.filed,
  daysElapsed: c.daysElapsed,
  deadline: c.deadline,
  daysRemaining: c.daysRemaining,
  location: c.location,
  department: c.department,
}))

const CLOSED_CASES = ALL_CASES.filter((c) => c.status === 'Closed')

/* ------------------------------------------------------------------ *
 * Ageing buckets — the single colour language for urgency on this page.
 * ------------------------------------------------------------------ */

export interface AgeingBucket {
  key: string
  label: string
  /**
   * Drawn only from the product palette — neutral, accent, warning, danger. This reads
   * as a severity ramp rather than four decorative hues, and it avoids introducing a
   * second accent colour, which the design system forbids.
   */
  color: string
  matches: (daysElapsed: number) => boolean
}

export const AGEING_BUCKETS: AgeingBucket[] = [
  { key: 'b0',  label: '0–30 days',  color: '#94A3B8', matches: (d) => d <= 30 },
  { key: 'b31', label: '31–60 days', color: '#1E40AF', matches: (d) => d > 30 && d <= 60 },
  { key: 'b61', label: '61–90 days', color: '#B45309', matches: (d) => d > 60 && d <= 90 },
  { key: 'b90', label: '90+ days',   color: '#B91C1C', matches: (d) => d > 90 },
]

export type AgeingRow = { stage: CaseStage; total: number } & Record<string, number | string>

/**
 * Case counts per stage, split into ageing buckets — derived from OPEN_CASES so the
 * chart can never drift out of step with the table below it.
 */
export function buildAgeingByStage(cases: ManagementCase[] = OPEN_CASES): AgeingRow[] {
  return CASE_STAGES.map((stage) => {
    const inStage = cases.filter((c) => c.stage === stage)
    const row = { stage, total: inStage.length } as AgeingRow
    for (const bucket of AGEING_BUCKETS) {
      row[bucket.key] = inStage.filter((c) => bucket.matches(c.daysElapsed)).length
    }
    return row
  }).filter((row) => row.total > 0)
}

/* ------------------------------------------------------------------ *
 * Complaints received — trailing 12 months
 * ------------------------------------------------------------------ */

export interface MonthlyIntake {
  month: string
  /** Full label for the tooltip. */
  period: string
  received: number
}

/** Sums to 24 — reconciles exactly with 13 open + 11 closed this financial year. */
export const COMPLAINTS_12M: MonthlyIntake[] = [
  { month: 'Aug', period: 'Aug 2025', received: 1 },
  { month: 'Sep', period: 'Sep 2025', received: 2 },
  { month: 'Oct', period: 'Oct 2025', received: 2 },
  { month: 'Nov', period: 'Nov 2025', received: 1 },
  { month: 'Dec', period: 'Dec 2025', received: 1 },
  { month: 'Jan', period: 'Jan 2026', received: 2 },
  { month: 'Feb', period: 'Feb 2026', received: 2 },
  { month: 'Mar', period: 'Mar 2026', received: 3 },
  { month: 'Apr', period: 'Apr 2026', received: 2 },
  { month: 'May', period: 'May 2026', received: 4 },
  { month: 'Jun', period: 'Jun 2026', received: 3 },
  { month: 'Jul', period: 'Jul 2026', received: 1 },
]

/* ------------------------------------------------------------------ *
 * Headline figures
 * ------------------------------------------------------------------ */

/**
 * Direction the figure moved, and whether that movement is favourable.
 * These are separate on purpose: for ageing and pendency, *down* is good, so an
 * arrow alone would mislead. The arrow shows movement; the colour shows intent.
 */
export type DeltaDirection = 'up' | 'down' | 'flat'
export type DeltaIntent = 'positive' | 'negative' | 'neutral'

export interface Kpi {
  key: string
  label: string
  /** Pre-formatted display value — keeps tabular alignment under our control. */
  value: string
  /** Set when the figure itself must carry a status colour. */
  tone?: 'critical'
  /** Small pill rendered beside the value. */
  pill?: { text: string; tone: 'success' }
  /** Statutory tag rendered under the value. */
  tag?: string
  delta: {
    direction: DeltaDirection
    intent: DeltaIntent
    /** Movement vs the prior quarter, already signed and formatted. */
    text: string
  }
}

const openCount = OPEN_CASES.length
const breachedCount = OPEN_CASES.filter((c) => c.daysRemaining < 0).length
const closedCount = CLOSED_CASES.length
const avgDaysToClosure = Math.round(
  CLOSED_CASES.reduce((sum, c) => sum + c.daysElapsed, 0) / CLOSED_CASES.length,
)

export const MANAGEMENT_KPIS: Kpi[] = [
  {
    key: 'open',
    label: 'Open cases',
    value: String(openCount),
    delta: { direction: 'down', intent: 'positive', text: '2 fewer vs last quarter' },
  },
  {
    key: 'closed',
    label: 'Closed this financial year',
    value: String(closedCount),
    delta: { direction: 'up', intent: 'positive', text: '3 more vs last quarter' },
  },
  {
    key: 'avg-closure',
    label: 'Average days to closure',
    value: String(avgDaysToClosure),
    delta: { direction: 'down', intent: 'positive', text: '7 days faster vs last quarter' },
  },
  {
    key: 'pending-90',
    label: 'Pending beyond 90 days',
    value: String(breachedCount),
    tone: 'critical',
    tag: 'Rule 8(5) disclosure',
    delta: { direction: 'down', intent: 'positive', text: '2 fewer vs last quarter' },
  },
  {
    key: 'ic',
    label: 'IC constitution',
    value: 'Compliant',
    pill: { text: 'Compliant', tone: 'success' },
    delta: { direction: 'flat', intent: 'neutral', text: 'Unchanged vs last quarter' },
  },
  {
    key: 'training',
    label: 'Training coverage',
    value: `${COMPLIANCE.trainingCoveragePct}%`,
    delta: { direction: 'up', intent: 'positive', text: '5 pts vs last quarter' },
  },
]
