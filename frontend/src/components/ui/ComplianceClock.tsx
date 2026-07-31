import type { Case } from '../../lib/data/types'
import { formatDate } from '../../lib/format'

export interface ClockMilestone {
  name: string
  rule: string
  status: 'done' | 'active' | 'pending'
  targetDate: string | null
  actualDate: string | null
  dayInfo: string | null
}

/** Build the 7-stage statutory track for the Compliance Clock centrepiece. */
export function buildClockMilestones(record: Case): ClockMilestone[] {
  const m = record.milestones
  const isFlagship = record.daysElapsed === 84 && record.stage === 'inquiry'

  return [
    {
      name: 'Complaint filed',
      rule: 'Day 0',
      status: 'done',
      targetDate: record.filedDate,
      actualDate: record.filedDate,
      dayInfo: null,
    },
    {
      name: 'Notice served on respondent',
      rule: 'Within 7 working days',
      status: m.noticeServedOn ? 'done' : record.daysElapsed > 12 ? 'active' : 'pending',
      targetDate: m.noticeDue,
      actualDate: m.noticeServedOn,
      dayInfo: m.noticeServedOn ? (isFlagship ? 'Day 4 of 7' : 'Completed within window') : null,
    },
    {
      name: 'Respondent reply received',
      rule: 'Within 10 working days',
      status: m.replyReceivedOn
        ? 'done'
        : m.noticeServedOn && !m.replyReceivedOn
          ? 'active'
          : 'pending',
      targetDate: m.replyDue,
      actualDate: m.replyReceivedOn,
      dayInfo: m.replyReceivedOn ? (isFlagship ? 'Day 9 of 10' : 'Completed within window') : null,
    },
    {
      name: 'Inquiry completion',
      rule: 'Within 90 days',
      status: m.inquiryCompletedOn ? 'done' : m.replyReceivedOn || record.stage === 'inquiry' ? 'active' : 'pending',
      targetDate: m.inquiryDue,
      actualDate: m.inquiryCompletedOn,
      dayInfo: m.inquiryCompletedOn
        ? null
        : record.stage === 'inquiry' || m.replyReceivedOn
          ? `Day ${record.daysElapsed} of 90`
          : null,
    },
    {
      name: 'IC report to employer',
      rule: 'Within 10 days of inquiry',
      status: m.reportSubmittedOn ? 'done' : m.inquiryCompletedOn ? 'active' : 'pending',
      targetDate: m.reportDue,
      actualDate: m.reportSubmittedOn,
      dayInfo: null,
    },
    {
      name: 'Employer action on recommendations',
      rule: 'Within 60 days',
      status: m.actionTakenOn ? 'done' : m.reportSubmittedOn ? 'active' : 'pending',
      targetDate: m.actionDue,
      actualDate: m.actionTakenOn,
      dayInfo: null,
    },
    {
      name: 'Appeal window',
      rule: '90 days',
      status: m.actionTakenOn ? (m.appealWindowEnds ? 'active' : 'done') : 'pending',
      targetDate: m.appealWindowEnds,
      actualDate: null,
      dayInfo: null,
    },
  ]
}

interface ComplianceClockProps {
  record: Case
  onRecordDelay?: () => void
}

/**
 * THE COMPLIANCE CLOCK — centrepiece of the case workspace left rail.
 * Vertical milestone track with statutory rules, target/actual dates, and delay alert.
 */
export function ComplianceClock({ record, onRecordDelay }: ComplianceClockProps) {
  const milestones = buildClockMilestones(record)

  return (
    <div className="cw-clock sweep-line">
      <div className="cw-clock-title">Compliance Clock</div>
      <div className="cw-milestone-track">
        {milestones.map((ms, i) => {
          const isLast = i === milestones.length - 1
          const dotClass =
            ms.status === 'done'
              ? 'cw-dot-done'
              : ms.status === 'active'
                ? 'cw-dot-active'
                : 'cw-dot-pending'

          // Green connector for completed segments; slate for pending.
          const lineClass = ms.status === 'done' ? 'cw-line-done' : 'cw-line-pending'

          return (
            <div key={ms.name} className="cw-milestone-row">
              <div className="cw-milestone-dot-col">
                <div className={`cw-milestone-dot ${dotClass}`} />
                {!isLast && <div className={`cw-milestone-line ${lineClass}`} />}
              </div>
              <div className="cw-milestone-info">
                <div className={`cw-milestone-name ${ms.status === 'active' ? 'cw-active-name' : ''}`}>
                  {ms.name}
                </div>
                <div className="cw-milestone-rule">{ms.rule}</div>
                <div className="cw-milestone-dates">
                  {ms.targetDate && <span>Target: {formatDate(ms.targetDate)}</span>}
                  {ms.actualDate && (
                    <span className="cw-date-actual">✓ {formatDate(ms.actualDate)}</span>
                  )}
                  {ms.dayInfo && (
                    <span
                      className={`cw-date-day-count ${ms.status === 'active' ? 'cw-danger' : ''}`}
                    >
                      {ms.dayInfo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {record.daysRemaining > 0 && record.daysRemaining <= 14 && (
        <div className="cw-alert-card">
          <div className="cw-alert-text">
            {record.daysRemaining} days remaining to complete inquiry. Delay beyond 90 days must
            be recorded with reasons.
          </div>
          <button type="button" className="cw-alert-btn" onClick={onRecordDelay}>
            Record reason for delay
          </button>
        </div>
      )}

      {record.isBreached && (
        <div className="cw-alert-card">
          <div className="cw-alert-text">
            Inquiry has exceeded the 90-day statutory window. Reportable under Rule 8(5).
          </div>
          {record.breachReason && (
            <div className="cw-alert-reason">
              <strong>Recorded reason:</strong> {record.breachReason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
