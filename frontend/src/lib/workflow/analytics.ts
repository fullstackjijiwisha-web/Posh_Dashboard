/**
 * Derived figures for the administrator's console.
 *
 * Everything the analytics screens draw is computed here, so a number that appears on
 * two screens is the same number and not two similar ones. Nothing in this file formats
 * or renders; it returns plain data.
 *
 * The statutory clocks are the spine of most of it:
 *   Rule 7(1)  notice on the respondent within 7 working days
 *   Rule 7(4)  respondent's reply within 10 working days
 *   s.11(4)    inquiry concluded within 90 days
 *   s.13(1)    report to the employer within 10 days of that
 *   s.13(4)    employer action within 60 days of the report
 *   s.21       annual return to the District Officer, within 30 days of year end
 */

import { differenceInCalendarDays, parseISO, format, subMonths, startOfMonth } from 'date-fns'
import type { Case } from '../data/types'
import type { CaseFlow } from './types'
import { STAGE_META } from './types'
import { dateNDaysAgo } from '../data/statutory'

export interface FlowPair {
  record: Case
  flow: CaseFlow
}

/* ------------------------------------------------------------------ *
 * Monthly trend
 * ------------------------------------------------------------------ */

export interface TrendPoint {
  month: string
  /** Complaints filed in the month. */
  filed: number
  /** Inquiries concluded in the month. */
  resolved: number
  /** Concluded within the 90-day window. */
  onTime: number
}

/** Twelve months back from the reporting date, oldest first. */
export function monthlyTrend(cases: Case[], months = 12): TrendPoint[] {
  const today = parseISO(dateNDaysAgo(0))
  const buckets = new Map<string, TrendPoint>()

  for (let i = months - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(today, i))
    const key = format(d, 'yyyy-MM')
    buckets.set(key, { month: format(d, 'MMM'), filed: 0, resolved: 0, onTime: 0 })
  }

  for (const c of cases) {
    const filedKey = c.filedDate.slice(0, 7)
    const filedBucket = buckets.get(filedKey)
    if (filedBucket) filedBucket.filed += 1

    const done = c.milestones.inquiryCompletedOn
    if (done) {
      const doneBucket = buckets.get(done.slice(0, 7))
      if (doneBucket) {
        doneBucket.resolved += 1
        const took = differenceInCalendarDays(parseISO(done), parseISO(c.filedDate))
        if (took <= 90) doneBucket.onTime += 1
      }
    }
  }

  return [...buckets.values()]
}

/* ------------------------------------------------------------------ *
 * Status breakdown
 * ------------------------------------------------------------------ */

export interface Slice {
  name: string
  value: number
  hue: string
}

/** Where the caseload sits on the workflow ladder, grouped into readable bands. */
export function statusBreakdown(pairs: FlowPair[]): Slice[] {
  const band = (stage: string) => {
    if (['complaint_submitted', 'complaint_under_review', 'complaint_accepted', 'case_created'].includes(stage))
      return 'Intake'
    if (['committee_assigned', 'committee_accepted'].includes(stage)) return 'Committee assignment'
    if (
      [
        'investigation_started',
        'evidence_review',
        'evidence_more_requested',
        'evidence_resubmitted',
        'evidence_verified',
      ].includes(stage)
    )
      return 'Inquiry'
    if (['hearing_scheduled', 'hearing_completed', 'minutes_recorded'].includes(stage)) return 'Hearings'
    if (
      ['recommendation_submitted', 'recommendation_review', 'recommendation_returned', 'recommendation_resubmitted'].includes(
        stage,
      )
    )
      return 'Recommendation'
    if (['recommendation_approved', 'final_decision_recorded'].includes(stage)) return 'Employer action'
    if (['case_closed', 'employee_notified', 'decision_viewed', 'feedback_submitted'].includes(stage)) return 'Closed'
    if (stage === 'case_archived') return 'Archived'
    return 'Not admitted'
  }

  const HUE: Record<string, string> = {
    Intake: '#3b82f6',
    'Committee assignment': '#60a5fa',
    Inquiry: '#10b981',
    Hearings: '#34d399',
    Recommendation: '#a78bfa',
    'Employer action': '#c4b5fd',
    Closed: '#8b9ba8',
    Archived: '#5c6b77',
    'Not admitted': '#ef4444',
  }

  const counts = new Map<string, number>()
  for (const p of pairs) {
    const b = band(p.flow.stage)
    counts.set(b, (counts.get(b) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([name, value]) => ({ name, value, hue: HUE[name] ?? '#8b9ba8' }))
    .sort((a, b) => b.value - a.value)
}

/* ------------------------------------------------------------------ *
 * SLA health
 * ------------------------------------------------------------------ */

export interface SlaBand {
  label: string
  provision: string
  met: number
  total: number
  pct: number
}

/**
 * Adherence against each statutory clock, judged only on cases where the clock has
 * actually run. A case whose report is not yet due is not counted as a miss — that would
 * make the figure a function of caseload age rather than of performance.
 */
export function slaHealth(cases: Case[]): { overall: number; bands: SlaBand[] } {
  const band = (label: string, provision: string, rows: Array<boolean | null>): SlaBand => {
    const applicable = rows.filter((r): r is boolean => r !== null)
    const met = applicable.filter(Boolean).length
    return {
      label,
      provision,
      met,
      total: applicable.length,
      pct: applicable.length ? (met / applicable.length) * 100 : 100,
    }
  }

  const notice = band(
    'Notice served in time',
    'Rule 7(1) — 7 working days',
    cases.map((c) =>
      c.milestones.noticeServedOn ? c.milestones.noticeServedOn <= c.milestones.noticeDue : null,
    ),
  )

  const reply = band(
    'Reply received in time',
    'Rule 7(4) — 10 working days',
    cases.map((c) =>
      c.milestones.replyReceivedOn ? c.milestones.replyReceivedOn <= c.milestones.replyDue : null,
    ),
  )

  const inquiry = band(
    'Inquiry within 90 days',
    's.11(4)',
    cases.map((c) =>
      c.milestones.inquiryCompletedOn
        ? differenceInCalendarDays(parseISO(c.milestones.inquiryCompletedOn), parseISO(c.filedDate)) <= 90
        : null,
    ),
  )

  const report = band(
    'Report to employer in time',
    's.13(1) — 10 days',
    cases.map((c) =>
      c.milestones.reportSubmittedOn && c.milestones.reportDue
        ? c.milestones.reportSubmittedOn <= c.milestones.reportDue
        : null,
    ),
  )

  const action = band(
    'Employer action in time',
    's.13(4) — 60 days',
    cases.map((c) =>
      c.milestones.actionTakenOn && c.milestones.actionDue ? c.milestones.actionTakenOn <= c.milestones.actionDue : null,
    ),
  )

  const bands = [notice, reply, inquiry, report, action]
  const met = bands.reduce((s, b) => s + b.met, 0)
  const total = bands.reduce((s, b) => s + b.total, 0)

  return { overall: total ? (met / total) * 100 : 100, bands }
}

/* ------------------------------------------------------------------ *
 * Decision statistics
 * ------------------------------------------------------------------ */

export interface DecisionStats {
  outcomes: Slice[]
  provisions: Array<{ name: string; value: number }>
  actions: Array<{ name: string; value: number }>
  decided: number
  upheldRate: number
  returnedRate: number
  averageVersions: number
}

export function decisionStatistics(pairs: FlowPair[]): DecisionStats {
  const withDecision = pairs.filter((p) => p.flow.finalDecision)
  const withRec = pairs.filter((p) => p.flow.recommendations.length > 0)

  const outcomeCounts = new Map<string, number>()
  for (const p of withDecision) {
    const o = p.flow.finalDecision!.outcome
    outcomeCounts.set(o, (outcomeCounts.get(o) ?? 0) + 1)
  }

  const OUTCOME_HUE: Record<string, string> = {
    Upheld: '#ef4444',
    'Upheld in part': '#f59e0b',
    'Not substantiated': '#8b9ba8',
  }

  const provisionCounts = new Map<string, number>()
  for (const p of withRec) {
    const last = p.flow.recommendations[p.flow.recommendations.length - 1]
    // Trim to the section reference; the full text is too long for an axis.
    const short = last.provision.split('—')[0].trim()
    provisionCounts.set(short, (provisionCounts.get(short) ?? 0) + 1)
  }

  const ACTION_BUCKETS: Array<[string, RegExp]> = [
    ['Written warning', /warning/i],
    ['Training / counselling', /training|counsel|sensitis/i],
    ['Reassignment', /reassign|transfer|reporting line/i],
    ['Compensation', /compensat|deduct|salary/i],
    ['No action', /no action|not substantiated/i],
  ]
  const actionCounts = new Map<string, number>()
  for (const p of withDecision) {
    const text = `${p.flow.finalDecision!.action} ${p.flow.finalDecision!.note}`
    let matched = false
    for (const [name, re] of ACTION_BUCKETS) {
      if (re.test(text)) {
        actionCounts.set(name, (actionCounts.get(name) ?? 0) + 1)
        matched = true
      }
    }
    if (!matched) actionCounts.set('Other', (actionCounts.get('Other') ?? 0) + 1)
  }

  const returned = withRec.filter((p) => p.flow.recommendations.length > 1).length
  const versions = withRec.reduce((s, p) => s + p.flow.recommendations.length, 0)
  const upheld = withDecision.filter((p) => p.flow.finalDecision!.outcome !== 'Not substantiated').length

  return {
    outcomes: [...outcomeCounts.entries()].map(([name, value]) => ({
      name,
      value,
      hue: OUTCOME_HUE[name] ?? '#8b9ba8',
    })),
    provisions: [...provisionCounts.entries()].map(([name, value]) => ({ name, value })),
    actions: [...actionCounts.entries()].map(([name, value]) => ({ name, value })),
    decided: withDecision.length,
    upheldRate: withDecision.length ? (upheld / withDecision.length) * 100 : 0,
    returnedRate: withRec.length ? (returned / withRec.length) * 100 : 0,
    averageVersions: withRec.length ? versions / withRec.length : 0,
  }
}

/* ------------------------------------------------------------------ *
 * Resolution audit
 * ------------------------------------------------------------------ */

export interface ResolutionRow {
  caseId: string
  filedDate: string
  /** Days the inquiry took, or days it has been running if it has not concluded. */
  daysToClose: number | null
  daysElapsed: number
  withinWindow: boolean | null
  /** Still open. */
  running: boolean
  /**
   * Past ninety days, whether it concluded late or is running late. An inquiry sitting
   * at day 96 with no reason on file is the reportable failure — counting only
   * *concluded* overruns would leave it out of the audit precisely while it is worst.
   */
  exceeded: boolean
  stage: string
  stageLabel: string
  breachReason: string | null
  outcome: string | null
  transitions: number
  department: string
}

export function resolutionAudit(pairs: FlowPair[]): ResolutionRow[] {
  return pairs
    .map(({ record, flow }) => {
      const done = record.milestones.inquiryCompletedOn
      const days = done ? differenceInCalendarDays(parseISO(done), parseISO(record.filedDate)) : null
      const running = days === null
      return {
        caseId: record.id,
        filedDate: record.filedDate,
        daysToClose: days,
        daysElapsed: record.daysElapsed,
        withinWindow: days === null ? null : days <= 90,
        running,
        exceeded: running ? record.isBreached : days! > 90,
        stage: flow.stage,
        stageLabel: STAGE_META[flow.stage].label,
        breachReason: record.breachReason,
        outcome: flow.finalDecision?.outcome ?? null,
        transitions: flow.history.length,
        department: record.department,
      }
    })
    .sort((a, b) => (b.daysToClose ?? b.daysElapsed) - (a.daysToClose ?? a.daysElapsed))
}

/* ------------------------------------------------------------------ *
 * Feedback
 * ------------------------------------------------------------------ */

export interface FeedbackSummary {
  count: number
  average: number
  distribution: Array<{ rating: number; count: number }>
  responses: Array<{ caseId: string; rating: number; comment: string; at: string }>
  responseRate: number
}

export function feedbackSummary(pairs: FlowPair[]): FeedbackSummary {
  const withFeedback = pairs.filter((p) => p.flow.feedback)
  // Everyone who reached the point at which feedback is invited.
  const eligible = pairs.filter((p) =>
    ['employee_notified', 'decision_viewed', 'feedback_submitted', 'case_archived'].includes(p.flow.stage),
  )

  const dist = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: withFeedback.filter((p) => p.flow.feedback!.rating === rating).length,
  }))

  const total = withFeedback.reduce((s, p) => s + p.flow.feedback!.rating, 0)

  return {
    count: withFeedback.length,
    average: withFeedback.length ? total / withFeedback.length : 0,
    distribution: dist,
    responses: withFeedback.map((p) => ({
      caseId: p.record.id,
      rating: p.flow.feedback!.rating,
      comment: p.flow.feedback!.comment,
      at: p.flow.feedback!.at,
    })),
    responseRate: eligible.length ? (withFeedback.length / eligible.length) * 100 : 0,
  }
}

/* ------------------------------------------------------------------ *
 * Departments and locations
 * ------------------------------------------------------------------ */

export function byDepartment(pairs: FlowPair[]): Array<{ name: string; open: number; closed: number; breached: number }> {
  const map = new Map<string, { name: string; open: number; closed: number; breached: number }>()
  for (const { record, flow } of pairs) {
    const row = map.get(record.department) ?? { name: record.department, open: 0, closed: 0, breached: 0 }
    const closed = ['case_closed', 'employee_notified', 'decision_viewed', 'feedback_submitted', 'case_archived'].includes(
      flow.stage,
    )
    if (closed) row.closed += 1
    else row.open += 1
    if (record.isBreached) row.breached += 1
    map.set(record.department, row)
  }
  return [...map.values()].sort((a, b) => b.open + b.closed - (a.open + a.closed))
}

/* ------------------------------------------------------------------ *
 * Compliance audits and trends
 * ------------------------------------------------------------------ */

export interface AuditTrendPoint {
  month: string
  /** Complaints filed per 1,000 employees. */
  density: number
  /** Share of that month's filings where notice went out inside Rule 7(1). */
  responseRate: number | null
  /** Mean days from filing to notice served. */
  responseDays: number | null
  filed: number
}

/**
 * Response rate against incident density.
 *
 * The pair is the point. Density alone says nothing useful — a rise usually means people
 * have started trusting the process, which is the objective, not the failure. What
 * matters is whether the organisation kept answering at the same speed as volume rose.
 * A response rate that sags as density climbs is the shape to watch for; both rising
 * together is a functioning process under load.
 */
export function complianceTrends(cases: Case[], totalEmployees: number, months = 7): AuditTrendPoint[] {
  const today = parseISO(dateNDaysAgo(0))
  const points: AuditTrendPoint[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = startOfMonth(subMonths(today, i))
    const key = format(d, 'yyyy-MM')
    const filedThisMonth = cases.filter((c) => c.filedDate.slice(0, 7) === key)

    // Only cases where notice has actually been served can be judged on speed.
    const served = filedThisMonth.filter((c) => c.milestones.noticeServedOn)
    const inTime = served.filter((c) => c.milestones.noticeServedOn! <= c.milestones.noticeDue)
    const days = served.map((c) =>
      differenceInCalendarDays(parseISO(c.milestones.noticeServedOn!), parseISO(c.filedDate)),
    )

    points.push({
      month: format(d, 'MMM'),
      filed: filedThisMonth.length,
      density: totalEmployees ? Number(((filedThisMonth.length / totalEmployees) * 1000).toFixed(2)) : 0,
      responseRate: served.length ? Number(((inTime.length / served.length) * 100).toFixed(0)) : null,
      responseDays: days.length ? Number((days.reduce((s, x) => s + x, 0) / days.length).toFixed(1)) : null,
    })
  }

  return points
}

/* ------------------------------------------------------------------ *
 * Compliance index
 * ------------------------------------------------------------------ */

export interface IndexComponent {
  label: string
  /** 0–100. */
  score: number
  /** Share of the composite. Weights sum to 1. */
  weight: number
  detail: string
  cite: string
}

export interface ComplianceIndex {
  score: number
  grade: 'A' | 'B' | 'C' | 'D'
  components: IndexComponent[]
  /** The component dragging hardest, weighted — what to fix first. */
  weakest: IndexComponent | null
}

/**
 * A single governance figure, for the one reader who needs one.
 *
 * The owner is not going to work through five dashboards, so this collapses the
 * organisation's position into one number. That is a real risk — a composite can hide
 * a zero behind four nineties — so the components are always shown alongside it, each
 * weighted, and the weakest is named outright rather than left to be spotted.
 *
 * Weights reflect what actually gets an employer into trouble: an unconstituted
 * committee or a missed statutory clock is a finding; a thin awareness programme is a
 * recommendation.
 */
export function complianceIndex(input: {
  boardsValid: boolean
  boardCount: number
  slaOverall: number
  breachedCount: number
  openCount: number
  dutiesEvidenced: number
  dutiesTotal: number
  trainingCoveragePct: number
  annualReturnReady: boolean
}): ComplianceIndex {
  const breachFree = input.openCount ? Math.max(0, 100 - (input.breachedCount / input.openCount) * 100) : 100

  const components: IndexComponent[] = [
    {
      label: 'Committee lawfully constituted',
      score: input.boardCount === 0 ? 0 : input.boardsValid ? 100 : 55,
      weight: 0.25,
      detail:
        input.boardCount === 0
          ? 'No Internal Committee has been constituted.'
          : input.boardsValid
            ? `${input.boardCount} board${input.boardCount === 1 ? '' : 's'}, each satisfying s.4.`
            : 'At least one board falls short of the composition s.4 requires.',
      cite: 's.4',
    },
    {
      label: 'Statutory timelines held',
      score: input.slaOverall,
      weight: 0.25,
      detail: 'Notice, reply, inquiry, report and employer action, judged only on clocks that have run.',
      cite: 'Rule 7 · s.11(4) · s.13',
    },
    {
      label: 'Inquiries inside the 90-day window',
      score: breachFree,
      weight: 0.2,
      detail: input.breachedCount
        ? `${input.breachedCount} of ${input.openCount} open inquiries have exceeded the window.`
        : 'No open inquiry has exceeded ninety days.',
      cite: 's.11(4) · Rule 8(5)',
    },
    {
      label: 'Employer duties evidenced',
      score: input.dutiesTotal ? (input.dutiesEvidenced / input.dutiesTotal) * 100 : 0,
      weight: 0.15,
      detail: `${input.dutiesEvidenced} of ${input.dutiesTotal} duties fully evidenced.`,
      cite: 's.19',
    },
    {
      label: 'Awareness coverage',
      score: input.trainingCoveragePct,
      weight: 0.1,
      detail: `${input.trainingCoveragePct}% of the workforce covered this year.`,
      cite: 's.19(c)',
    },
    {
      label: 'Annual return ready',
      score: input.annualReturnReady ? 100 : 0,
      weight: 0.05,
      detail: input.annualReturnReady
        ? 'Every field on the District Officer filing is populated.'
        : 'The return is not yet ready to file.',
      cite: 's.21',
    },
  ]

  const score = components.reduce((s, c) => s + c.score * c.weight, 0)
  const grade: ComplianceIndex['grade'] = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D'

  // Weighted shortfall, not raw score — a 55 at weight 0.25 hurts more than a 40 at 0.05.
  const weakest =
    [...components].sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)[0] ?? null

  return { score, grade, components, weakest: weakest && weakest.score < 100 ? weakest : null }
}

/** Median rather than mean — one badly delayed inquiry should not move the headline. */
export function medianDaysToClosure(cases: Case[]): number {
  const durations = cases
    .map((c) =>
      c.milestones.inquiryCompletedOn
        ? differenceInCalendarDays(parseISO(c.milestones.inquiryCompletedOn), parseISO(c.filedDate))
        : null,
    )
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)
  if (!durations.length) return 0
  const mid = Math.floor(durations.length / 2)
  return durations.length % 2 ? durations[mid] : Math.round((durations[mid - 1] + durations[mid]) / 2)
}
