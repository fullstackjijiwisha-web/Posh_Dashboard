/**
 * Clock Cascade dialog — what-if simulator for statutory deadlines.
 */

import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { AlertTriangle, GitBranch, NotebookPen, X } from 'lucide-react'
import type { Case } from '../../lib/data/types'
import type { CaseFlow } from '../../lib/workflow/types'
import { useWorkflow } from '../../lib/workflow/store'
import { useToast } from '../../lib/toast'
import { formatDate } from '../../lib/format'
import { hearingsFor } from '../../lib/data/caseDetail'
import { REPORTING_DATE } from '../../lib/data/statutory'
import {
  cascadeNoteText,
  EMPTY_INPUTS,
  projectCascade,
  type CascadeInputs,
  type CascadeRow,
  type CascadeSeverity,
} from '../../lib/cascade/project'
import './ClockCascade.css'

const ICON = { size: 16, strokeWidth: 1.5 } as const

function RollingDate({ value }: { value: string | null }) {
  if (!value) return <span className="ccas-date muted">—</span>
  return (
    <span key={value} className="ccas-date mono ccas-roll">
      {formatDate(value)}
    </span>
  )
}

function Delta({ days }: { days: number }) {
  if (days === 0) return <span className="ccas-delta zero">unchanged</span>
  const sign = days > 0 ? '+' : ''
  return (
    <span className={`ccas-delta ${days > 0 ? 'later' : 'earlier'}`}>
      {sign}
      {days}d
    </span>
  )
}

function severityLabel(s: CascadeSeverity): string {
  if (s === 'met') return 'Met'
  if (s === 'comfortable') return 'Comfortable'
  if (s === 'tight') return 'Tight'
  return 'Would breach'
}

function RowPair({ row, index }: { row: CascadeRow; index: number }) {
  return (
    <div
      className={`ccas-row sev-${row.severity}${row.severity === 'breach' ? ' pulse-breach' : ''}`}
      style={{ ['--ccas-i' as string]: String(index) }}
    >
      <div className="ccas-row-meta">
        <div className="ccas-row-name">{row.name}</div>
        <div className="ccas-row-rule">{row.rule}</div>
        {row.detail && <div className="ccas-row-detail">{row.detail}</div>}
      </div>
      <div className="ccas-col current">
        <RollingDate value={row.currentDate} />
      </div>
      <div className="ccas-bridge" aria-hidden="true">
        <span className="ccas-line" />
        <Delta days={row.deltaDays} />
      </div>
      <div className="ccas-col projected">
        <RollingDate value={row.projectedDate} />
        <span className={`ccas-sev sev-${row.severity}`}>{severityLabel(row.severity)}</span>
      </div>
    </div>
  )
}

export function ClockCascadeDialog({
  record,
  flow,
  focusHearingId,
  onClose,
}: {
  record: Case
  flow: CaseFlow | undefined
  /** When opened from a sitting row, pre-fill a meaningful sitting shift. */
  focusHearingId?: string | null
  onClose: () => void
}) {
  const { addAdvisoryNote, applySittingShift } = useWorkflow()
  const { push } = useToast()
  const [inputs, setInputs] = useState<CascadeInputs>(() => ({
    ...EMPTY_INPUTS,
    sittingShiftDays: focusHearingId ? 7 : 0,
  }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const result = useMemo(
    () => projectCascade(record, flow, inputs, REPORTING_DATE),
    [record, flow, inputs],
  )

  const set = <K extends keyof CascadeInputs>(key: K, value: CascadeInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const scheduledIds = useMemo(() => {
    const today = REPORTING_DATE
    const fixture = hearingsFor(record.id)
      .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
      .map((h) => h.id)
    const live = (flow?.hearings ?? [])
      .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
      .map((h) => h.id)
    const ids = new Set([...fixture, ...live])
    if (focusHearingId) ids.add(focusHearingId)
    return [...ids]
  }, [record.id, flow, focusHearingId])

  const saveNote = () => {
    if (!flow) {
      push('No workflow record on this case yet', 'error')
      return
    }
    addAdvisoryNote(record.id, cascadeNoteText(result), result.wouldBreachInquiry)
    push(
      result.wouldBreachInquiry
        ? 'Cascade saved as a concern note for the committee'
        : 'Cascade projection saved to the case record',
      result.wouldBreachInquiry ? 'warning' : 'success',
    )
  }

  const apply = () => {
    const unavail =
      inputs.unavailableFrom && inputs.unavailableTo && inputs.unavailableTo >= inputs.unavailableFrom
        ? Math.max(
            0,
            differenceInCalendarDays(parseISO(inputs.unavailableTo), parseISO(inputs.unavailableFrom)) + 1,
          )
        : 0
    const slip = Math.max(0, inputs.sittingShiftDays) + unavail
    if (slip > 0 && scheduledIds.length) {
      applySittingShift(record.id, slip, scheduledIds)
    }
    if (flow) {
      addAdvisoryNote(record.id, cascadeNoteText(result), result.wouldBreachInquiry)
    }
    push(
      slip > 0
        ? `Applied — upcoming sittings moved by ${slip} day${slip === 1 ? '' : 's'}`
        : 'Projection recorded on the case',
      result.wouldBreachInquiry ? 'warning' : 'success',
    )
    onClose()
  }

  return (
    <>
      <div className="ccas-overlay" onClick={onClose} />
      <div
        className="ccas-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Clock Cascade — model a change"
      >
        <div className="ccas-head">
          <div>
            <div className="ccas-eyebrow">
              <GitBranch {...ICON} />
              Clock Cascade
            </div>
            <h2>Model a change</h2>
            <p>
              See how a scheduling slip ripples through every statutory deadline on{' '}
              <span className="mono">{record.id}</span>.
            </p>
          </div>
          <button type="button" className="ccas-close" onClick={onClose} aria-label="Close">
            <X {...ICON} />
          </button>
        </div>

        <div
          className={`ccas-headline sev-${result.wouldBreachInquiry ? 'breach' : result.totalSlipDays ? 'tight' : 'comfortable'}`}
          role="status"
          aria-live="polite"
        >
          {result.wouldBreachInquiry && <AlertTriangle size={18} strokeWidth={1.5} />}
          <span key={result.headline} className="ccas-headline-text">
            {result.headline}
          </span>
        </div>

        <div className="ccas-body">
          <aside className="ccas-controls">
            <div className="ccas-control-label">What if</div>

            <label className="ccas-field">
              <span>Move this sitting by</span>
              <div className="ccas-stepper">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => set('sittingShiftDays', Math.max(0, inputs.sittingShiftDays - 1))}
                  aria-label="Fewer days"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={inputs.sittingShiftDays}
                  onChange={(e) => set('sittingShiftDays', Math.max(0, Number(e.target.value) || 0))}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => set('sittingShiftDays', Math.min(60, inputs.sittingShiftDays + 1))}
                  aria-label="More days"
                >
                  +
                </button>
                <span className="ccas-unit">days</span>
              </div>
            </label>

            <label className="ccas-field">
              <span>Delay evidence verification by</span>
              <div className="ccas-stepper">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => set('evidenceDelayDays', Math.max(0, inputs.evidenceDelayDays - 1))}
                  aria-label="Fewer days"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={inputs.evidenceDelayDays}
                  onChange={(e) => set('evidenceDelayDays', Math.max(0, Number(e.target.value) || 0))}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => set('evidenceDelayDays', Math.min(60, inputs.evidenceDelayDays + 1))}
                  aria-label="More days"
                >
                  +
                </button>
                <span className="ccas-unit">days</span>
              </div>
            </label>

            <label className="ccas-field">
              <span>Add days for the respondent&apos;s reply</span>
              <div className="ccas-stepper">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => set('replyExtraDays', Math.max(0, inputs.replyExtraDays - 1))}
                  aria-label="Fewer days"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={inputs.replyExtraDays}
                  onChange={(e) => set('replyExtraDays', Math.max(0, Number(e.target.value) || 0))}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => set('replyExtraDays', Math.min(30, inputs.replyExtraDays + 1))}
                  aria-label="More days"
                >
                  +
                </button>
                <span className="ccas-unit">days</span>
              </div>
            </label>

            <div className="ccas-field">
              <span>Committee unavailable</span>
              <div className="ccas-range">
                <input
                  type="date"
                  value={inputs.unavailableFrom}
                  onChange={(e) => set('unavailableFrom', e.target.value)}
                  aria-label="Unavailable from"
                />
                <span className="ccas-range-sep">to</span>
                <input
                  type="date"
                  value={inputs.unavailableTo}
                  min={inputs.unavailableFrom || undefined}
                  onChange={(e) => set('unavailableTo', e.target.value)}
                  aria-label="Unavailable to"
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary ccas-reset"
              onClick={() => setInputs({ ...EMPTY_INPUTS })}
            >
              Reset inputs
            </button>
          </aside>

          <div className="ccas-compare">
            <div className="ccas-compare-head">
              <span />
              <span>Current projection</span>
              <span />
              <span>If this change</span>
            </div>
            <div className="ccas-rows" key={JSON.stringify(inputs)}>
              {result.rows.map((row, i) => (
                <RowPair key={row.id} row={row} index={i} />
              ))}
            </div>
          </div>
        </div>

        <div className="ccas-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-secondary" onClick={saveNote}>
            <NotebookPen size={14} strokeWidth={1.5} />
            Save as a note
          </button>
          <button type="button" className="btn btn-primary" onClick={apply}>
            Apply this change
          </button>
        </div>
      </div>
    </>
  )
}
