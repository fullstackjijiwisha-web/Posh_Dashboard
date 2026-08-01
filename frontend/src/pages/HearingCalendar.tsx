import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Link2,
  MapPin,
  Users,
  X,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { useToast } from '../lib/toast'
import { formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import {
  attendanceFor,
  attendanceSummary,
  collectSittings,
  conflictsForSitting,
  dayKey,
  downloadIcs,
  feedUrlFor,
  findConflicts,
  rescheduleSitting,
  setAttendance,
  todayDate,
  type CalendarSitting,
} from '../lib/calendar/sittings'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/calendar/CalendarExtras.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type ViewMode = 'month' | 'week'

/**
 * Meeting schedule — month/week, colour-coded by bench validity, with attendance
 * confirmation, conflict warnings, .ics export and drag-to-reschedule.
 */
export function HearingCalendarPage() {
  const { myAssignedCases, flowFor } = useWorkflow()
  const { currentUser } = useRole()
  const { push } = useToast()

  const today = todayDate()
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<string | null>(dayKey(today))
  const [view, setView] = useState<ViewMode>('month')
  const [tick, setTick] = useState(0)
  const [dragging, setDragging] = useState<CalendarSitting | null>(null)
  const [reschedule, setReschedule] = useState<{ sitting: CalendarSitting; date: string } | null>(null)
  const [reason, setReason] = useState('')

  const sittings = useMemo(() => {
    void tick
    const uid = currentUser?.id ?? ''
    return collectSittings(myAssignedCases, flowFor).map((s) => ({
      ...s,
      mine: s.attendees.includes(uid),
    }))
  }, [myAssignedCases, flowFor, currentUser?.id, tick])

  const conflicts = useMemo(() => findConflicts(sittings), [sittings])

  const byDay = useMemo(() => {
    const map = new Map<string, typeof sittings>()
    for (const s of sittings) {
      const k = s.at.slice(0, 10)
      map.set(k, [...(map.get(k) ?? []), s])
    }
    for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at))
    return map
  }, [sittings])

  const cells = useMemo(() => {
    if (view === 'week') {
      const anchor = selected ? new Date(selected + 'T00:00:00') : today
      const offset = (anchor.getDay() + 6) % 7
      const start = new Date(anchor)
      start.setDate(anchor.getDate() - offset)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        return d
      })
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(first.getDate() - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor, view, selected, today])

  const selectedSittings = selected ? (byDay.get(selected) ?? []) : []
  const monthLabel = cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const upcomingAll = sittings
    .filter((s) => !s.done && s.at.slice(0, 10) >= dayKey(today))
    .sort((a, b) => a.at.localeCompare(b.at))

  const step = (n: number) => {
    if (view === 'week' && selected) {
      const d = new Date(selected + 'T00:00:00')
      d.setDate(d.getDate() + n * 7)
      setSelected(dayKey(d))
      setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
    } else {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))
    }
  }

  const chipClass = (s: (typeof sittings)[number]) => {
    if (s.done) return 'ep-cal-chip done'
    if (s.short) return 'ep-cal-chip short'
    if (s.mine) return 'ep-cal-chip mine'
    return 'ep-cal-chip'
  }

  const confirmMove = () => {
    if (!reschedule || !reason.trim()) return
    const time = reschedule.sitting.at.slice(11, 19) || '11:00:00'
    rescheduleSitting(reschedule.sitting.id, `${reschedule.date}T${time}`, reason)
    setTick((t) => t + 1)
    setSelected(reschedule.date)
    setReschedule(null)
    setReason('')
    push('Sitting moved. The quorum test was re-run on the new date.', 'success')
  }

  const rsvp = (sittingId: string, status: 'confirmed' | 'declined') => {
    if (!currentUser) return
    setAttendance(sittingId, currentUser.id, status)
    setTick((t) => t + 1)
    push(status === 'confirmed' ? 'Attendance confirmed.' : 'Decline recorded.', 'info')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Hearing calendar</h1>
          <p>
            Every sitting on the cases you sit on. Colour marks bench validity; conflicts and
            attendance show before the morning of the sitting, not on it.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="cal-view-toggle" role="group" aria-label="Calendar view">
            <button
              type="button"
              className={view === 'month' ? 'active' : ''}
              onClick={() => setView('month')}
            >
              Month
            </button>
            <button
              type="button"
              className={view === 'week' ? 'active' : ''}
              onClick={() => setView('week')}
            >
              Week
            </button>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const mine = sittings.filter((s) => s.mine && !s.done)
              downloadIcs(mine, 'sentinel-my-sittings.ics', 'Sentinel — my sittings')
              push('Calendar file downloaded.', 'success')
            }}
          >
            <Download {...ICON} />
            Export .ics
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const url = feedUrlFor(currentUser?.id ?? 'user')
              void navigator.clipboard.writeText(url)
              push('Feed URL copied — paste into Outlook or Google Calendar.', 'success')
            }}
          >
            <Link2 {...ICON} />
            Copy feed URL
          </button>
        </div>
      </div>

      {conflicts.length > 0 ? (
        <div className="cal-banner warning" role="status">
          <AlertTriangle size={15} strokeWidth={1.5} />
          {conflicts.length} diary conflict{conflicts.length === 1 ? '' : 's'} — a member is listed
          at two venues in an overlapping window.
        </div>
      ) : null}

      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-body">
            <div className="ep-cal-head">
              <span className="ep-cal-month">
                {view === 'week' && selected
                  ? `Week of ${new Date(selected + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                  : monthLabel}
              </span>
              <div className="ep-cal-nav">
                <button type="button" className="btn btn-secondary" onClick={() => step(-1)} aria-label="Previous">
                  <ChevronLeft {...ICON} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
                    setSelected(dayKey(today))
                  }}
                >
                  Today
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => step(1)} aria-label="Next">
                  <ChevronRight {...ICON} />
                </button>
              </div>
            </div>

            <div className={`ep-cal-grid${view === 'week' ? ' week' : ''}`}>
              {DOW.map((d) => (
                <div key={d} className="ep-cal-dow">
                  {d}
                </div>
              ))}
              {cells.map((d) => {
                const k = dayKey(d)
                const list = byDay.get(k) ?? []
                const outside = view === 'month' && d.getMonth() !== cursor.getMonth()
                const isToday = k === dayKey(today)
                return (
                  <div
                    key={k}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(k)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(k)}
                    onDragOver={(e) => {
                      if (dragging) e.preventDefault()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (!dragging || dragging.done) return
                      if (dragging.at.slice(0, 10) === k) return
                      setReschedule({ sitting: dragging, date: k })
                      setDragging(null)
                    }}
                    className={`ep-cal-cell${outside ? ' outside' : ''}${isToday ? ' today' : ''}${
                      selected === k ? ' selected' : ''
                    }${dragging ? ' drop-target' : ''}`}
                  >
                    <span className="ep-cal-num">{d.getDate()}</span>
                    {list.slice(0, view === 'week' ? 8 : 3).map((s) => (
                      <span
                        key={s.id}
                        draggable={!s.done}
                        onDragStart={(e) => {
                          e.stopPropagation()
                          setDragging(s)
                        }}
                        onDragEnd={() => setDragging(null)}
                        className={chipClass(s)}
                        title={`${s.title} — ${s.caseId}${s.short ? ' · bench short' : ''}`}
                      >
                        {s.at.slice(11, 16)} {s.caseId.slice(-4)}
                        {s.short ? ' !' : ''}
                      </span>
                    ))}
                    {list.length > (view === 'week' ? 8 : 3) ? (
                      <span className="ep-cal-num">+{list.length - (view === 'week' ? 8 : 3)} more</span>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div className="cal-legend">
              <span><i className="ep-cal-chip mine" /> You attend</span>
              <span><i className="ep-cal-chip short" /> Bench short</span>
              <span><i className="ep-cal-chip done" /> Held</span>
              <span className="text-12 text-muted">Drag a sitting onto another day to reschedule</span>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <CalendarDays size={15} strokeWidth={1.5} />
                {selected
                  ? new Date(selected + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Select a day'}
              </span>
              <span className="meta-pill">{selectedSittings.length}</span>
            </div>
            <div className="ep-card-body">
              {selectedSittings.length === 0 ? (
                <p className="text-13 text-muted">No sitting on this day.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {selectedSittings.map((s) => {
                    const conf = conflictsForSitting(s.id, conflicts)
                    const att = attendanceSummary(s)
                    const myStatus = currentUser ? attendanceFor(s.id, currentUser.id) : 'awaiting'
                    return (
                      <div key={s.id} style={{ borderLeft: `2px solid ${s.short ? 'var(--color-warning, #f59e0b)' : 'var(--color-accent)'}`, paddingLeft: 12 }}>
                        <div className="ep-hearing-title">{s.title}</div>
                        <div className="ep-hearing-meta">{formatTimestamp(s.at)}</div>
                        <div className="ep-hearing-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} strokeWidth={1.5} />
                          {s.where}
                        </div>
                        <div className="ep-hearing-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={11} strokeWidth={1.5} />
                          {s.attendees.map(actorName).join(', ')}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Link to={`/cases/${s.caseId}`} className="mono text-12" style={{ color: 'var(--color-accent)' }}>
                            {s.caseId}
                          </Link>
                          {s.mine ? <span className="badge badge-completed">You attend</span> : <span className="badge badge-low">Panel</span>}
                          {s.short ? <span className="badge badge-medium">Bench short</span> : <span className="badge badge-completed">Bench valid</span>}
                          {s.done ? <span className="badge badge-closed">Held</span> : null}
                          {att.predictedShort && !s.done ? (
                            <span className="badge badge-medium">Short predicted</span>
                          ) : null}
                        </div>
                        {conf.length > 0 ? (
                          <div className="cal-conflict" role="status">
                            <AlertTriangle size={12} strokeWidth={1.5} />
                            Diary conflict: {conf.map((c) => c.memberName).join(', ')} also listed on{' '}
                            {conf.map((c) => (c.caseA === s.caseId ? c.caseB : c.caseA)).join(', ')}
                          </div>
                        ) : null}
                        {!s.done ? (
                          <div className="cal-rsvp">
                            <span className="text-12 text-muted">
                              Attendance · {att.confirmed} confirmed · {att.awaiting} awaiting · {att.declined} declined
                            </span>
                            {s.mine && currentUser ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  className={`btn btn-secondary${myStatus === 'confirmed' ? ' cal-rsvp-active' : ''}`}
                                  onClick={() => rsvp(s.id, 'confirmed')}
                                >
                                  <Check size={12} strokeWidth={2} /> Confirm
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-secondary${myStatus === 'declined' ? ' cal-rsvp-active' : ''}`}
                                  onClick={() => rsvp(s.id, 'declined')}
                                >
                                  <X size={12} strokeWidth={2} /> Decline
                                </button>
                              </div>
                            ) : null}
                            <div className="cal-att-row">
                              {s.attendees.map((mid) => {
                                const st = attendanceFor(s.id, mid)
                                return (
                                  <span key={mid} className={`cal-att ${st}`} title={`${actorName(mid)} — ${st}`}>
                                    {actorName(mid).split(' ')[0]} · {st}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">Next sittings</span>
            </div>
            <div className="ep-card-body tight">
              {upcomingAll.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing listed ahead.
                </p>
              ) : (
                upcomingAll.slice(0, 6).map((s) => {
                  const d = new Date(s.at)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="ep-hearing"
                      style={{ width: '100%', textAlign: 'left' }}
                      onClick={() => {
                        setCursor(new Date(d.getFullYear(), d.getMonth(), 1))
                        setSelected(s.at.slice(0, 10))
                      }}
                    >
                      <div className="ep-hearing-date">
                        <div className="ep-hearing-day">{d.getDate()}</div>
                        <div className="ep-hearing-month">
                          {d.toLocaleString('en-IN', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ep-hearing-title">{s.title}</div>
                        <div className="ep-hearing-meta">
                          {s.at.slice(11, 16)} · {s.caseId}
                          {s.short ? ' · short' : ''}
                        </div>
                      </div>
                      {s.mine ? <span className="badge badge-completed">You</span> : null}
                    </button>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {reschedule ? (
        <div className="cal-modal-root" role="presentation">
          <button type="button" className="cal-modal-backdrop" aria-label="Cancel" onClick={() => setReschedule(null)} />
          <div className="cal-modal" role="dialog" aria-modal="true" aria-label="Confirm reschedule">
            <h2>Move sitting</h2>
            <p className="text-13 text-muted">
              {reschedule.sitting.title} ({reschedule.sitting.caseId}) moves to{' '}
              {new Date(reschedule.date + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              . A reason is required, and the quorum test runs again on the new date.
            </p>
            <label className="wf-field">
              Reason for the move
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Member unavailable; venue conflict; party request…"
                rows={3}
              />
            </label>
            <div className="wf-note-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setReschedule(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={!reason.trim()} onClick={confirmMove}>
                Confirm move
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
