/**
 * Clock Cascade — what-if projection of statutory and operational deadlines.
 *
 * A scheduling slip does not move the statutory windows (inquiry is still 90 days
 * from filing). It moves the *projected completion* dates. Severity is judged by
 * comparing those projections to the fixed statutory limits.
 */

import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Case } from '../data/types'
import { REPORTING_DATE, STATUTORY } from '../data/statutory'
import type { CaseFlow } from '../workflow/types'
import { hearingsFor } from '../data/caseDetail'

const ISO = 'yyyy-MM-dd'

export interface CascadeInputs {
  /** Shift upcoming sittings forward by this many calendar days. */
  sittingShiftDays: number
  /** Extra days before evidence can be verified. */
  evidenceDelayDays: number
  /** Extra days granted for the respondent's reply. */
  replyExtraDays: number
  /** Committee unavailable window (inclusive ISO dates), or empty. */
  unavailableFrom: string
  unavailableTo: string
}

export type CascadeSeverity = 'comfortable' | 'tight' | 'breach' | 'met'

export interface CascadeRow {
  id: string
  name: string
  rule: string
  /** Fixed statutory limit, if any. */
  statutoryDue: string | null
  currentDate: string | null
  projectedDate: string | null
  /** projected − current, in calendar days. */
  deltaDays: number
  severity: CascadeSeverity
  /** Plain-language note for breach / tight rows. */
  detail: string | null
  /** Days of headroom vs statutory due after the projection (null if N/A). */
  headroomDays: number | null
  /** Already completed on the record — cascade does not move it. */
  locked: boolean
}

export interface CascadeResult {
  inputs: CascadeInputs
  rows: CascadeRow[]
  headline: string
  /** Total slip applied to the unfinished inquiry track. */
  totalSlipDays: number
  wouldBreachInquiry: boolean
  inquiryOvershootDays: number
}

export const EMPTY_INPUTS: CascadeInputs = {
  sittingShiftDays: 0,
  evidenceDelayDays: 0,
  replyExtraDays: 0,
  unavailableFrom: '',
  unavailableTo: '',
}

function iso(d: Date): string {
  return format(d, ISO)
}

function shift(date: string | null, days: number): string | null {
  if (!date || days === 0) return date
  return iso(addDays(parseISO(date), days))
}

function unavailableDays(from: string, to: string): number {
  if (!from || !to || to < from) return 0
  return Math.max(0, differenceInCalendarDays(parseISO(to), parseISO(from)) + 1)
}

function nextScheduledSitting(caseId: string, flow: CaseFlow | undefined, today: string): string | null {
  const fixture = hearingsFor(caseId)
    .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
    .map((h) => h.at.slice(0, 10))
  const live = (flow?.hearings ?? [])
    .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
    .map((h) => h.at.slice(0, 10))
  const all = [...fixture, ...live].sort()
  return all[0] ?? null
}

function lastScheduledSitting(caseId: string, flow: CaseFlow | undefined, today: string): string | null {
  const fixture = hearingsFor(caseId)
    .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
    .map((h) => h.at.slice(0, 10))
  const live = (flow?.hearings ?? [])
    .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
    .map((h) => h.at.slice(0, 10))
  const all = [...fixture, ...live].sort()
  return all.length ? all[all.length - 1]! : null
}

function severityFor(opts: {
  locked: boolean
  projected: string | null
  statutoryDue: string | null
  deltaDays: number
}): { severity: CascadeSeverity; headroom: number | null; detail: string | null } {
  const { locked, projected, statutoryDue, deltaDays } = opts
  if (locked) {
    return { severity: 'met', headroom: null, detail: null }
  }
  if (!projected || !statutoryDue) {
    if (deltaDays === 0) return { severity: 'comfortable', headroom: null, detail: null }
    return { severity: 'tight', headroom: null, detail: null }
  }
  const headroom = differenceInCalendarDays(parseISO(statutoryDue), parseISO(projected))
  if (headroom < 0) {
    return {
      severity: 'breach',
      headroom,
      detail: null, // filled by caller with a named sentence
    }
  }
  if (deltaDays === 0 && headroom >= 14) {
    return { severity: 'comfortable', headroom, detail: null }
  }
  if (headroom >= 0) {
    return {
      severity: headroom < 14 || deltaDays !== 0 ? 'tight' : 'comfortable',
      headroom,
      detail: null,
    }
  }
  return { severity: 'comfortable', headroom, detail: null }
}

/**
 * Project how the clocks move under a set of what-if inputs.
 */
export function projectCascade(
  record: Case,
  flow: CaseFlow | undefined,
  inputs: CascadeInputs,
  today: string = REPORTING_DATE,
): CascadeResult {
  const m = record.milestones
  const unavail = unavailableDays(inputs.unavailableFrom, inputs.unavailableTo)
  // Slip that pushes everything still open on the inquiry track.
  const trackSlip =
    Math.max(0, inputs.sittingShiftDays) +
    Math.max(0, inputs.evidenceDelayDays) +
    Math.max(0, inputs.replyExtraDays) +
    unavail

  const nextSitting = nextScheduledSitting(record.id, flow, today)
  const lastSitting = lastScheduledSitting(record.id, flow, today)

  // Current projected inquiry completion: day after the last upcoming sitting,
  // or the statutory due if no sitting is listed, or the actual if already done.
  const currentInquiryProjected = m.inquiryCompletedOn
    ? m.inquiryCompletedOn
    : lastSitting
      ? iso(addDays(parseISO(lastSitting), 1))
      : m.inquiryDue

  const projectedInquiry = m.inquiryCompletedOn
    ? m.inquiryCompletedOn
    : shift(currentInquiryProjected, trackSlip)!

  const currentReplyProjected = m.replyReceivedOn
    ? m.replyReceivedOn
    : m.replyDue
  const projectedReply = m.replyReceivedOn
    ? m.replyReceivedOn
    : shift(currentReplyProjected, Math.max(0, inputs.replyExtraDays) + unavail)

  const currentEvidence = nextSitting
    ? iso(addDays(parseISO(nextSitting), -1))
    : iso(addDays(parseISO(today), 3))
  const projectedEvidence = shift(
    currentEvidence,
    Math.max(0, inputs.evidenceDelayDays) + Math.max(0, inputs.sittingShiftDays) + unavail,
  )

  const currentSitting = nextSitting
  const projectedSitting = shift(
    currentSitting,
    Math.max(0, inputs.sittingShiftDays) + unavail,
  )

  const currentReport = m.reportSubmittedOn
    ? m.reportSubmittedOn
    : m.reportDue ?? iso(addDays(parseISO(currentInquiryProjected), STATUTORY.REPORT_DAYS))
  const projectedReport = m.reportSubmittedOn
    ? m.reportSubmittedOn
    : iso(addDays(parseISO(projectedInquiry), STATUTORY.REPORT_DAYS))

  const currentAction = m.actionTakenOn
    ? m.actionTakenOn
    : m.actionDue ?? iso(addDays(parseISO(currentReport), STATUTORY.EMPLOYER_ACTION_DAYS))
  const projectedAction = m.actionTakenOn
    ? m.actionTakenOn
    : iso(addDays(parseISO(projectedReport), STATUTORY.EMPLOYER_ACTION_DAYS))

  const currentAppeal = m.appealWindowEnds
  const projectedAppeal = m.reportSubmittedOn
    ? m.appealWindowEnds
    : iso(addDays(parseISO(projectedReport), STATUTORY.APPEAL_DAYS))

  const rows: CascadeRow[] = []

  const push = (
    id: string,
    name: string,
    rule: string,
    statutoryDue: string | null,
    currentDate: string | null,
    projectedDate: string | null,
    locked: boolean,
    breachLabel?: (overshoot: number) => string,
  ) => {
    const deltaDays =
      currentDate && projectedDate
        ? differenceInCalendarDays(parseISO(projectedDate), parseISO(currentDate))
        : 0
    const base = severityFor({ locked, projected: projectedDate, statutoryDue, deltaDays })
    let detail = base.detail
    if (base.severity === 'breach' && statutoryDue && projectedDate && breachLabel) {
      const overshoot = differenceInCalendarDays(parseISO(projectedDate), parseISO(statutoryDue))
      detail = breachLabel(overshoot)
    } else if (base.severity === 'tight' && base.headroom != null && base.headroom >= 0) {
      detail = `${base.headroom} day${base.headroom === 1 ? '' : 's'} of headroom remaining`
    }
    rows.push({
      id,
      name,
      rule,
      statutoryDue,
      currentDate,
      projectedDate,
      deltaDays,
      severity: base.severity,
      detail,
      headroomDays: base.headroom,
      locked,
    })
  }

  push(
    'notice',
    'Notice served on respondent',
    'Rule 7(1) — 7 working days',
    m.noticeDue,
    m.noticeServedOn ?? m.noticeDue,
    m.noticeServedOn ?? m.noticeDue,
    !!m.noticeServedOn,
  )

  push(
    'reply',
    'Respondent reply',
    'Rule 7(4) — 10 working days',
    m.replyDue,
    currentReplyProjected,
    projectedReply,
    !!m.replyReceivedOn,
    (o) => `Reply would fall ${o} day${o === 1 ? '' : 's'} beyond the Rule 7(4) window`,
  )

  push(
    'evidence',
    'Evidence verification',
    'Operational — before the next sitting',
    null,
    currentEvidence,
    projectedEvidence,
    false,
  )

  push(
    'sitting',
    'Next sitting',
    'Listed on the cause list',
    null,
    currentSitting,
    projectedSitting,
    !currentSitting,
  )

  const inquiryOvershoot = differenceInCalendarDays(parseISO(projectedInquiry), parseISO(m.inquiryDue))
  push(
    'inquiry',
    'Inquiry completion',
    `s.11(4) — ${STATUTORY.INQUIRY_DAYS} days`,
    m.inquiryDue,
    currentInquiryProjected,
    projectedInquiry,
    !!m.inquiryCompletedOn,
    (o) =>
      `Inquiry completion would fall ${o} day${o === 1 ? '' : 's'} beyond the ${STATUTORY.INQUIRY_DAYS}-day limit`,
  )

  push(
    'report',
    'IC report to employer',
    `s.13(1) — ${STATUTORY.REPORT_DAYS} days after inquiry`,
    m.reportDue ??
      (m.inquiryCompletedOn
        ? iso(addDays(parseISO(m.inquiryCompletedOn), STATUTORY.REPORT_DAYS))
        : iso(addDays(parseISO(m.inquiryDue), STATUTORY.REPORT_DAYS))),
    currentReport,
    projectedReport,
    !!m.reportSubmittedOn,
    (o) => `Report would fall ${o} day${o === 1 ? '' : 's'} past the s.13(1) window`,
  )

  push(
    'action',
    'Employer action',
    `s.13(4) — ${STATUTORY.EMPLOYER_ACTION_DAYS} days`,
    m.actionDue ?? iso(addDays(parseISO(currentReport), STATUTORY.EMPLOYER_ACTION_DAYS)),
    currentAction,
    projectedAction,
    !!m.actionTakenOn,
    (o) => `Employer action would fall ${o} day${o === 1 ? '' : 's'} past the s.13(4) window`,
  )

  push(
    'appeal',
    'Appeal window closes',
    `s.18 — ${STATUTORY.APPEAL_DAYS} days`,
    currentAppeal,
    currentAppeal,
    projectedAppeal,
    !!m.actionTakenOn && !!m.appealWindowEnds && m.appealWindowEnds < today,
  )

  const wouldBreachInquiry = !m.inquiryCompletedOn && inquiryOvershoot > 0
  const spare = !wouldBreachInquiry
    ? differenceInCalendarDays(parseISO(m.inquiryDue), parseISO(projectedInquiry))
    : 0

  let headline: string
  if (trackSlip === 0 && unavail === 0) {
    headline = 'No change modelled yet. Adjust the inputs to see how the clocks would move.'
  } else if (wouldBreachInquiry) {
    const parts: string[] = []
    if (inputs.sittingShiftDays > 0) parts.push(`Moving the sitting by ${inputs.sittingShiftDays} day${inputs.sittingShiftDays === 1 ? '' : 's'}`)
    else if (inputs.evidenceDelayDays > 0) parts.push(`Delaying evidence verification by ${inputs.evidenceDelayDays} day${inputs.evidenceDelayDays === 1 ? '' : 's'}`)
    else if (inputs.replyExtraDays > 0) parts.push(`Adding ${inputs.replyExtraDays} day${inputs.replyExtraDays === 1 ? '' : 's'} for the respondent's reply`)
    else parts.push(`A committee unavailability of ${unavail} day${unavail === 1 ? '' : 's'}`)
    headline = `${parts[0]} pushes inquiry completion ${inquiryOvershoot} day${inquiryOvershoot === 1 ? '' : 's'} past the statutory limit and would require a recorded reason.`
  } else if (trackSlip > 0 || unavail > 0) {
    headline = `This change fits comfortably. All deadlines still met with ${spare} day${spare === 1 ? '' : 's'} to spare.`
  } else {
    headline = 'All deadlines still met.'
  }

  // Prefer a richer headline when multiple levers moved and we breach.
  if (wouldBreachInquiry && trackSlip > 0) {
    const levers: string[] = []
    if (inputs.sittingShiftDays > 0) levers.push(`sitting +${inputs.sittingShiftDays}d`)
    if (inputs.evidenceDelayDays > 0) levers.push(`evidence +${inputs.evidenceDelayDays}d`)
    if (inputs.replyExtraDays > 0) levers.push(`reply +${inputs.replyExtraDays}d`)
    if (unavail > 0) levers.push(`committee unavailable ${unavail}d`)
    if (levers.length > 1) {
      headline = `The combined slip (${levers.join(', ')}) pushes inquiry completion ${inquiryOvershoot} day${inquiryOvershoot === 1 ? '' : 's'} past the statutory limit and would require a recorded reason.`
    }
  }

  return {
    inputs,
    rows,
    headline,
    totalSlipDays: trackSlip,
    wouldBreachInquiry,
    inquiryOvershootDays: Math.max(0, inquiryOvershoot),
  }
}

/** Format a cascade note for the committee record. */
export function cascadeNoteText(result: CascadeResult): string {
  const lines = [
    `Clock Cascade projection — ${result.headline}`,
    '',
    `Inputs: sitting +${result.inputs.sittingShiftDays}d, evidence +${result.inputs.evidenceDelayDays}d, reply +${result.inputs.replyExtraDays}d` +
      (result.inputs.unavailableFrom
        ? `, committee unavailable ${result.inputs.unavailableFrom} → ${result.inputs.unavailableTo}`
        : ''),
    '',
    ...result.rows.map((r) => {
      const cur = r.currentDate ?? '—'
      const proj = r.projectedDate ?? '—'
      const delta = r.deltaDays === 0 ? 'unchanged' : r.deltaDays > 0 ? `+${r.deltaDays}d` : `${r.deltaDays}d`
      return `· ${r.name}: ${cur} → ${proj} (${delta})${r.detail ? ` — ${r.detail}` : ''}`
    }),
  ]
  return lines.join('\n')
}
