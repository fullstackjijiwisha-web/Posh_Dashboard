/**
 * Time Machine scrubber — pinned under the case header.
 *
 * Drag the handle, click a notch, type a date, replay from filing to today.
 */

import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { History, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { formatDate } from '../../lib/format'
import type { TimelineEvent } from '../../lib/timemachine/types'
import type { TimeMachineApi } from '../../lib/timemachine/useTimeMachine'
import './TimeMachine.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

interface Props {
  tm: TimeMachineApi
  filedDate: string
  notches: TimelineEvent[]
}

function dayLabel(iso: string): string {
  // "03 June 2026" — long form for the banner.
  const d = parseISO(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function TimeMachineBar({ tm, filedDate, notches }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const totalDays = Math.max(1, differenceInCalendarDays(parseISO(tm.today), parseISO(filedDate)))
  const elapsed = Math.min(
    totalDays,
    Math.max(0, differenceInCalendarDays(parseISO(tm.asOf), parseISO(filedDate))),
  )
  const pct = (elapsed / totalDays) * 100

  const notchPositions = useMemo(() => {
    return notches
      .filter((n) => {
        const d = n.at.slice(0, 10)
        return d >= filedDate && d <= tm.today
      })
      .map((n) => {
        const days = differenceInCalendarDays(parseISO(n.at.slice(0, 10)), parseISO(filedDate))
        return { event: n, pct: Math.min(100, Math.max(0, (days / totalDays) * 100)) }
      })
  }, [notches, filedDate, tm.today, totalDays])

  const dayFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return tm.asOf
      const rect = el.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const days = Math.round(ratio * totalDays)
      return format(addDays(parseISO(filedDate), days), 'yyyy-MM-dd')
    },
    [filedDate, totalDays, tm.asOf],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (tm.replaying) tm.stopReplay()
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    tm.scrubTo(dayFromClientX(e.clientX))
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    tm.scrubTo(dayFromClientX(e.clientX))
  }

  const onPointerUp = () => {
    dragging.current = false
  }

  return (
    <div className={`tm-bar${tm.isHistorical ? ' is-historical' : ''}${tm.replaying ? ' is-replaying' : ''}`}>
      <div className="tm-bar-head">
        <div className="tm-bar-title">
          <History {...ICON} aria-hidden="true" />
          <span>Time Machine</span>
        </div>
        <div className="tm-bar-actions">
          <label className="tm-date-jump">
            <span className="sr-only">Jump to date</span>
            <input
              type="date"
              min={filedDate}
              max={tm.today}
              value={tm.asOf}
              onChange={(e) => {
                if (!e.target.value) return
                tm.stopReplay()
                tm.jumpTo(e.target.value)
              }}
              aria-label="Jump to date"
            />
          </label>

          {tm.replaying ? (
            <button
              type="button"
              className="btn btn-secondary tm-allow"
              onClick={() => (tm.paused ? tm.resumeReplay() : tm.pauseReplay())}
              aria-label={tm.paused ? 'Resume replay' : 'Pause replay'}
            >
              {tm.paused ? <Play {...ICON} /> : <Pause {...ICON} />}
              {tm.paused ? 'Resume' : 'Pause'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary tm-allow"
              onClick={() => tm.startReplay()}
              title="Animate from filing to today over twelve seconds"
            >
              <Play {...ICON} />
              Replay case
            </button>
          )}

          {tm.isHistorical && (
            <button
              type="button"
              className="btn btn-primary tm-allow"
              onClick={() => tm.returnToToday()}
            >
              <SkipForward {...ICON} />
              Return to today
            </button>
          )}

          {tm.replaying && (
            <button type="button" className="btn btn-secondary tm-allow" onClick={() => tm.returnToToday()}>
              <RotateCcw {...ICON} />
              Stop
            </button>
          )}
        </div>
      </div>

      {tm.isHistorical && (
        <div className="tm-banner" role="status" aria-live="polite">
          <span>
            Viewing as at <strong>{dayLabel(tm.asOf)}</strong>
            {tm.view.daysAgo > 0 ? ` — ${tm.view.daysAgo} day${tm.view.daysAgo === 1 ? '' : 's'} ago` : ''}
          </span>
          <button type="button" className="tm-banner-return tm-allow" onClick={() => tm.returnToToday()}>
            Return to today
          </button>
        </div>
      )}

      <div
        className="tm-track"
        ref={trackRef}
        role="slider"
        aria-label="Case timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={totalDays}
        aria-valuenow={elapsed}
        aria-valuetext={`${formatDate(tm.asOf)}${tm.isHistorical ? ` — ${tm.view.daysAgo} days ago` : ' — today'}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault()
            tm.stopReplay()
            const delta = e.key === 'ArrowLeft' ? -1 : 1
            const next = format(addDays(parseISO(tm.asOf), delta), 'yyyy-MM-dd')
            if (next >= filedDate && next <= tm.today) tm.jumpTo(next)
          }
          if (e.key === 'Home') {
            e.preventDefault()
            tm.stopReplay()
            tm.jumpTo(filedDate)
          }
          if (e.key === 'End') {
            e.preventDefault()
            tm.returnToToday()
          }
        }}
      >
        <div className="tm-track-fill" style={{ width: `${pct}%` }} />
        {notchPositions.map(({ event, pct: np }) => (
          <button
            key={event.id}
            type="button"
            className={`tm-notch kind-${event.kind}${event.at.slice(0, 10) <= tm.asOf ? ' is-past' : ''}`}
            style={{ left: `${np}%` }}
            title={`${formatDate(event.at)} — ${event.label}${event.detail ? `\n${event.detail}` : ''}`}
            aria-label={`${event.label} on ${formatDate(event.at)}`}
            onClick={(e) => {
              e.stopPropagation()
              tm.stopReplay()
              tm.jumpTo(event.at.slice(0, 10))
            }}
          />
        ))}
        <div className="tm-handle" style={{ left: `${pct}%` }} aria-hidden="true">
          <span className="tm-handle-knob" />
          <span className="tm-handle-label mono">{formatDate(tm.asOf)}</span>
        </div>
      </div>

      <div className="tm-ends">
        <span className="mono">{formatDate(filedDate)}</span>
        <span className="tm-ends-mid meta">
          {tm.view.evidenceCount} evidence · {tm.view.documentCount} documents · {tm.view.hearingCount} sittings
        </span>
        <span className="mono">{formatDate(tm.today)}</span>
      </div>
    </div>
  )
}
