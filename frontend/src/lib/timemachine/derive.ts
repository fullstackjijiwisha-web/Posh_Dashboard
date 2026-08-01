/**
 * Derive the case state as it stood on a given date.
 *
 * Replay every event with `at ≤ asOf`, then project:
 *   · workflow stage (last stage-bearing event)
 *   · milestones (cleared if their date is after asOf)
 *   · daysElapsed / daysRemaining relative to asOf
 *   · evidence, documents, hearings, recommendations filtered by date
 *   · history truncated
 */

import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Case, CaseStage } from '../data/types'
import { REPORTING_DATE, inquiryDeadline } from '../data/statutory'
import { evidenceForCase } from '../data/evidence'
import { documentsFor, hearingsFor } from '../data/caseDetail'
import type { CaseFlow, FlowEvent, WorkflowStage } from '../workflow/types'
import { buildEventLog, significantEvents } from './log'
import type { TimelineEvent } from './types'

/** Map a workflow stage back to the coarser CaseStage used by StagePill. */
const CASE_STAGE_FOR: Partial<Record<WorkflowStage, CaseStage>> = {
  complaint_submitted: 'registered',
  complaint_under_review: 'registered',
  complaint_accepted: 'registered',
  case_created: 'registered',
  complaint_rejected: 'closed',
  committee_assigned: 'registered',
  committee_accepted: 'registered',
  investigation_started: 'inquiry',
  evidence_review: 'inquiry',
  evidence_verified: 'inquiry',
  hearing_scheduled: 'inquiry',
  hearing_completed: 'inquiry',
  minutes_recorded: 'inquiry',
  recommendation_submitted: 'report_pending',
  recommendation_review: 'report_pending',
  recommendation_approved: 'employer_action',
  recommendation_rejected: 'report_pending',
  final_decision_recorded: 'employer_action',
  case_closed: 'closed',
  employee_notified: 'closed',
  decision_viewed: 'closed',
  feedback_submitted: 'closed',
  case_archived: 'archived',
}

export interface AsOfView {
  asOf: string
  isToday: boolean
  daysAgo: number
  events: TimelineEvent[]
  notches: TimelineEvent[]
  stage: WorkflowStage
  history: FlowEvent[]
  /** Case record recomputed for the clocks and parties. */
  record: Case
  evidenceIds: Set<string>
  documentIds: Set<string>
  hearingIds: Set<string>
  recommendationIds: Set<string>
  evidenceCount: number
  documentCount: number
  hearingCount: number
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function isOnOrBefore(iso: string, asOf: string): boolean {
  return dayKey(iso) <= dayKey(asOf)
}

export function deriveAt(
  record: Case,
  flow: CaseFlow | undefined,
  asOf: string,
  today: string = REPORTING_DATE,
): AsOfView {
  const events = buildEventLog(record, flow)
  const asOfDay = dayKey(asOf)
  const todayDay = dayKey(today)
  const isToday = asOfDay >= todayDay
  const effectiveAsOf = isToday ? todayDay : asOfDay

  const past = events.filter((e) => isOnOrBefore(e.at, effectiveAsOf))
  const notches = significantEvents(events)

  // At "today", prefer the live store so scrubbing home never invents a different stage.
  if (isToday) {
    const fixtureEv = evidenceForCase(record.id)
    const flowEv = flow?.evidence ?? []
    const fixtureDoc = documentsFor(record.id)
    const flowDoc = flow?.documents ?? []
    const fixtureHrg = hearingsFor(record.id)
    const flowHrg = flow?.hearings ?? []
    const recs = flow?.recommendations ?? []
    const evidenceIds = new Set([...fixtureEv.map((e) => e.id), ...flowEv.map((e) => e.id)])
    const documentIds = new Set([...fixtureDoc.map((d) => d.id), ...flowDoc.map((d) => d.id)])
    const hearingIds = new Set([...fixtureHrg.map((h) => h.id), ...flowHrg.map((h) => h.id)])
    return {
      asOf: effectiveAsOf,
      isToday: true,
      daysAgo: 0,
      events: past,
      notches,
      stage: flow?.stage ?? 'complaint_submitted',
      history: flow?.history ?? [],
      record,
      evidenceIds,
      documentIds,
      hearingIds,
      recommendationIds: new Set(recs.map((r) => r.id)),
      evidenceCount: evidenceIds.size,
      documentCount: documentIds.size,
      hearingCount: hearingIds.size,
    }
  }

  // Workflow stage = last event that carries a stage.
  let stage: WorkflowStage = 'complaint_submitted'
  for (const e of past) {
    if (e.stage) stage = e.stage
  }

  const history = (flow?.history ?? []).filter((h) => isOnOrBefore(h.at, effectiveAsOf))

  const daysElapsed = Math.max(
    0,
    differenceInCalendarDays(parseISO(effectiveAsOf), parseISO(record.filedDate)),
  )
  const inquiryDue = inquiryDeadline(record.filedDate)
  const daysRemaining = differenceInCalendarDays(parseISO(inquiryDue), parseISO(effectiveAsOf))

  const m = record.milestones
  const milestones = {
    ...m,
    noticeServedOn: m.noticeServedOn && isOnOrBefore(m.noticeServedOn, effectiveAsOf) ? m.noticeServedOn : null,
    replyReceivedOn: m.replyReceivedOn && isOnOrBefore(m.replyReceivedOn, effectiveAsOf) ? m.replyReceivedOn : null,
    inquiryCompletedOn:
      m.inquiryCompletedOn && isOnOrBefore(m.inquiryCompletedOn, effectiveAsOf) ? m.inquiryCompletedOn : null,
    reportSubmittedOn:
      m.reportSubmittedOn && isOnOrBefore(m.reportSubmittedOn, effectiveAsOf) ? m.reportSubmittedOn : null,
    actionTakenOn: m.actionTakenOn && isOnOrBefore(m.actionTakenOn, effectiveAsOf) ? m.actionTakenOn : null,
    appealWindowEnds:
      m.appealWindowEnds && m.actionTakenOn && isOnOrBefore(m.actionTakenOn, effectiveAsOf)
        ? m.appealWindowEnds
        : null,
  }

  const isBreached = daysRemaining < 0 && !milestones.inquiryCompletedOn
  const caseStage = CASE_STAGE_FOR[stage] ?? record.stage

  const historicalRecord: Case = {
    ...record,
    stage: caseStage,
    daysElapsed,
    daysRemaining,
    isBreached,
    breachReason: isBreached ? record.breachReason : null,
    milestones,
  }

  const fixtureEv = evidenceForCase(record.id).filter((e) => isOnOrBefore(e.receivedOn, effectiveAsOf))
  const flowEv = (flow?.evidence ?? []).filter((e) => isOnOrBefore(e.uploadedAt, effectiveAsOf))
  const fixtureDoc = documentsFor(record.id).filter((d) => isOnOrBefore(d.uploadedAt, effectiveAsOf))
  const flowDoc = (flow?.documents ?? []).filter((d) => isOnOrBefore(d.createdAt, effectiveAsOf))
  const fixtureHrg = hearingsFor(record.id).filter((h) => isOnOrBefore(h.at, effectiveAsOf))
  const flowHrg = (flow?.hearings ?? []).filter((h) => isOnOrBefore(h.at, effectiveAsOf))
  const recs = (flow?.recommendations ?? []).filter((r) => isOnOrBefore(r.at, effectiveAsOf))

  const evidenceIds = new Set([...fixtureEv.map((e) => e.id), ...flowEv.map((e) => e.id)])
  const documentIds = new Set([...fixtureDoc.map((d) => d.id), ...flowDoc.map((d) => d.id)])
  const hearingIds = new Set([...fixtureHrg.map((h) => h.id), ...flowHrg.map((h) => h.id)])
  const recommendationIds = new Set(recs.map((r) => r.id))

  return {
    asOf: effectiveAsOf,
    isToday: false,
    daysAgo: Math.max(0, differenceInCalendarDays(parseISO(todayDay), parseISO(effectiveAsOf))),
    events: past,
    notches,
    stage,
    history,
    record: historicalRecord,
    evidenceIds,
    documentIds,
    hearingIds,
    recommendationIds,
    evidenceCount: evidenceIds.size,
    documentCount: documentIds.size,
    hearingCount: hearingIds.size,
  }
}
