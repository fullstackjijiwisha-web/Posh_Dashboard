import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  PlayCircle,
} from 'lucide-react'
import type { Case } from '../../lib/data/types'
import { formatDate } from '../../lib/format'
import './ComplianceClock.css'

export type ClockState = 'met' | 'running' | 'not_started' | 'breached'

export interface ClockMilestone {
  name: string
  rule: string
  /** Statutory basis shown on hover. */
  basis: string
  state: ClockState
  targetDate: string | null
  actualDate: string | null
  /** Days remaining on an active clock; null otherwise. */
  daysRemaining: number | null
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + (from.length === 10 ? 'T00:00:00' : ''))
  const b = new Date(to + (to.length === 10 ? 'T00:00:00' : ''))
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** Build the statutory track for the Compliance Clock centrepiece. */
export function buildClockMilestones(record: Case, todayIso?: string): ClockMilestone[] {
  const m = record.milestones
  const today =
    todayIso ??
    (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })()

  const remainingTo = (due: string | null): number | null => {
    if (!due) return null
    return daysBetween(today, due)
  }

  const noticeDone = !!m.noticeServedOn
  const replyDone = !!m.replyReceivedOn
  const inquiryDone = !!m.inquiryCompletedOn
  const reportDone = !!m.reportSubmittedOn
  const actionDone = !!m.actionTakenOn

  const noticeLate = !noticeDone && m.noticeDue < today
  const replyLate = noticeDone && !replyDone && !!m.replyDue && m.replyDue < today
  const inquiryLate = !inquiryDone && (record.isBreached || m.inquiryDue < today)
  const reportLate = inquiryDone && !reportDone && !!m.reportDue && m.reportDue < today
  const actionLate = reportDone && !actionDone && !!m.actionDue && m.actionDue < today

  return [
    {
      name: 'Complaint filed',
      rule: 'Day 0',
      basis: 'The complaint is registered. All subsequent clocks run from this date.',
      state: 'met',
      targetDate: record.filedDate,
      actualDate: record.filedDate,
      daysRemaining: null,
    },
    {
      name: 'Notice served on respondent',
      rule: 'Within 7 working days',
      basis: 'Rule 7(1) — notice of the complaint within seven working days of receipt.',
      state: noticeDone ? 'met' : noticeLate ? 'breached' : 'running',
      targetDate: m.noticeDue,
      actualDate: m.noticeServedOn,
      daysRemaining: noticeDone || noticeLate ? null : remainingTo(m.noticeDue),
    },
    {
      name: 'Respondent reply received',
      rule: 'Within 10 working days',
      basis: 'Rule 7(4) — the respondent may reply within ten working days of the notice.',
      state: replyDone
        ? 'met'
        : replyLate
          ? 'breached'
          : noticeDone
            ? 'running'
            : 'not_started',
      targetDate: m.replyDue,
      actualDate: m.replyReceivedOn,
      daysRemaining: replyDone || replyLate || !noticeDone ? null : remainingTo(m.replyDue),
    },
    {
      name: 'Inquiry completion',
      rule: 'Within 90 days',
      basis: 's.11(4) — the inquiry shall be completed within a period of ninety days.',
      state: inquiryDone
        ? 'met'
        : inquiryLate
          ? 'breached'
          : replyDone || record.stage === 'inquiry' || noticeDone
            ? 'running'
            : 'not_started',
      targetDate: m.inquiryDue,
      actualDate: m.inquiryCompletedOn,
      daysRemaining: inquiryDone
        ? null
        : inquiryLate
          ? record.daysRemaining
          : remainingTo(m.inquiryDue),
    },
    {
      name: 'IC report to employer',
      rule: 'Within 10 days of inquiry',
      basis: 's.13(1) — the committee shall provide a report within ten days of completing the inquiry.',
      state: reportDone
        ? 'met'
        : reportLate
          ? 'breached'
          : inquiryDone
            ? 'running'
            : 'not_started',
      targetDate: m.reportDue,
      actualDate: m.reportSubmittedOn,
      daysRemaining: reportDone || reportLate || !inquiryDone ? null : remainingTo(m.reportDue),
    },
    {
      name: 'Employer action on recommendations',
      rule: 'Within 60 days',
      basis: 's.13(4) — the employer shall act on the recommendations within sixty days.',
      state: actionDone
        ? 'met'
        : actionLate
          ? 'breached'
          : reportDone
            ? 'running'
            : 'not_started',
      targetDate: m.actionDue,
      actualDate: m.actionTakenOn,
      daysRemaining: actionDone || actionLate || !reportDone ? null : remainingTo(m.actionDue),
    },
    {
      name: 'Appeal window',
      rule: '90 days',
      basis: 's.18 — either party may appeal within ninety days of the recommendations.',
      state: actionDone
        ? m.appealWindowEnds && m.appealWindowEnds >= today
          ? 'running'
          : 'met'
        : 'not_started',
      targetDate: m.appealWindowEnds,
      actualDate: null,
      daysRemaining:
        actionDone && m.appealWindowEnds && m.appealWindowEnds >= today
          ? remainingTo(m.appealWindowEnds)
          : null,
    },
  ]
}

const STATE_LABEL: Record<ClockState, string> = {
  met: 'Met',
  running: 'Running',
  not_started: 'Not started',
  breached: 'Breached',
}

function StateIcon({ state }: { state: ClockState }) {
  const props = { size: 12, strokeWidth: 2 } as const
  if (state === 'met') return <CheckCircle2 {...props} />
  if (state === 'running') return <PlayCircle {...props} />
  if (state === 'breached') return <AlertTriangle {...props} />
  return <Circle {...props} />
}

function urgencyClass(ms: ClockMilestone): string {
  if (ms.state === 'breached') return 'breached'
  if (ms.state === 'met') return 'met'
  if (ms.state === 'not_started') return 'idle'
  if (ms.daysRemaining != null && ms.daysRemaining <= 14) return 'urgent'
  return 'running'
}

interface ComplianceClockProps {
  record: Case
  onRecordDelay?: () => void
  /** When set, clocks recompute as if "today" were this date (Time Machine). */
  asOf?: string
}

/**
 * THE COMPLIANCE CLOCK — hero of the case record.
 *
 * A vertical timeline with a filled progress spine. Colour encodes urgency and is
 * always paired with an icon and a text label. Breached clocks pulse slowly —
 * gravity, not an alarm.
 */
export function ComplianceClock({ record, onRecordDelay, asOf }: ComplianceClockProps) {
  const milestones = useMemo(() => buildClockMilestones(record, asOf), [record, asOf])
  const historical = !!asOf
  const [nowLabel, setNowLabel] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))

  // Live countdown tick once a minute so "12 days remaining" stays honest across a long session.
  useEffect(() => {
    if (historical) return
    const id = window.setInterval(() => {
      setNowLabel(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    }, 60_000)
    return () => window.clearInterval(id)
  }, [historical])

  const activeIdx = milestones.findIndex((m) => m.state === 'running' || m.state === 'breached')
  const metCount = milestones.filter((m) => m.state === 'met').length
  const progress = metCount / Math.max(1, milestones.length - 1)
  const anyBreached = milestones.some((m) => m.state === 'breached') || record.isBreached

  return (
    <div
      className={`cc-clock elev-2${anyBreached ? ' is-breached' : ''}`}
      aria-live="polite"
      aria-label="Compliance clock"
    >
      <div className="cc-head">
        <div>
          <div className="cc-eyebrow">
            <Clock size={13} strokeWidth={1.5} />
            Compliance clock
          </div>
          <div className="cc-title">Statutory track</div>
        </div>
        <span
          className="cc-live"
          title={historical ? `As at ${asOf}` : `Updated ${nowLabel}`}
        >
          <span className="live-dot" aria-hidden="true" />
          {historical ? 'As at' : 'Live'}
        </span>
      </div>

      <div className="cc-track" style={{ ['--cc-progress' as string]: String(progress) }}>
        <div className="cc-spine" aria-hidden="true">
          <div className="cc-spine-fill" />
        </div>

        {milestones.map((ms, i) => {
          const active = i === activeIdx
          const urg = urgencyClass(ms)
          return (
            <div
              key={ms.name}
              className={`cc-row state-${ms.state}${active ? ' is-active' : ''} urg-${urg}`}
              title={ms.basis}
            >
              <div className="cc-dot-col">
                <span className={`cc-dot state-${ms.state}`} aria-hidden="true">
                  <StateIcon state={ms.state} />
                </span>
              </div>
              <div className="cc-body">
                <div className="cc-name-row">
                  <span className="cc-name">{ms.name}</span>
                  <span className={`cc-state-pill state-${ms.state}`}>
                    <StateIcon state={ms.state} />
                    {STATE_LABEL[ms.state]}
                  </span>
                </div>
                <div className="cc-rule">{ms.rule}</div>
                <div className="cc-dates">
                  {ms.targetDate ? (
                    <span>
                      Target <strong className="mono">{formatDate(ms.targetDate)}</strong>
                    </span>
                  ) : null}
                  {ms.actualDate ? (
                    <span className="cc-met-date">
                      Met <strong className="mono">{formatDate(ms.actualDate)}</strong>
                    </span>
                  ) : null}
                </div>
                {active && ms.daysRemaining != null ? (
                  <div className={`cc-countdown urg-${urg}`} aria-live="polite">
                    {ms.state === 'breached'
                      ? ms.daysRemaining < 0
                        ? `${Math.abs(ms.daysRemaining)} days past the limit`
                        : 'Past the statutory limit'
                      : ms.daysRemaining === 0
                        ? 'Due today'
                        : `${ms.daysRemaining} day${ms.daysRemaining === 1 ? '' : 's'} remaining`}
                  </div>
                ) : null}
                <div className="cc-basis">{ms.basis}</div>
              </div>
            </div>
          )
        })}
      </div>

      {record.daysRemaining > 0 && record.daysRemaining <= 14 && !record.isBreached ? (
        <div className="cc-alert">
          <div className="cc-alert-text">
            {record.daysRemaining} days remaining to complete the inquiry. Delay beyond 90 days
            must be recorded with reasons.
          </div>
          {onRecordDelay ? (
            <button type="button" className="btn btn-secondary" onClick={onRecordDelay}>
              Record reason for delay
            </button>
          ) : null}
        </div>
      ) : null}

      {record.isBreached ? (
        <div className="cc-alert breached">
          <div className="cc-alert-text">
            Inquiry has exceeded the 90-day statutory window. Reportable under Rule 8(5).
          </div>
          {record.breachReason ? (
            <div className="cc-alert-reason">
              <strong>Recorded reason:</strong> {record.breachReason}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
