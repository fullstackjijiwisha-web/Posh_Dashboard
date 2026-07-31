import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { hearingsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Sitting {
  id: string
  caseId: string
  at: string
  title: string
  where: string
  attendees: string[]
  mine: boolean
  done: boolean
}

/** Local yyyy-mm-dd, so a sitting never lands on the wrong day west of Greenwich. */
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Meeting schedule.
 *
 * A month grid rather than a table, because the question a panel member brings to this
 * screen is "which week am I sitting", and a list of twelve rows sorted by date does not
 * answer it. Sittings the signed-in member attends are accented; the rest of the panel's
 * are shown but recede.
 */
export function HearingCalendarPage() {
  const { myAssignedCases, flowFor } = useWorkflow()
  const { currentUser } = useRole()

  const today = new Date(dateNDaysAgo(0) + 'T00:00:00')
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<string | null>(key(today))

  const sittings = useMemo<Sitting[]>(() => {
    const uid = currentUser?.id ?? ''
    return myAssignedCases.flatMap((record) => {
      const flow = flowFor(record.id)
      const fixture = hearingsFor(record.id).map((h) => ({
        id: h.id,
        caseId: record.id,
        at: h.at,
        title: h.title,
        where: h.location,
        attendees: h.attendeeIds,
        mine: h.attendeeIds.includes(uid),
        done: h.status === 'Completed' || h.status === 'Adjourned',
      }))
      const listed = (flow?.hearings ?? []).map((h) => ({
        id: h.id,
        caseId: record.id,
        at: h.at,
        title: h.agenda,
        where: h.location,
        attendees: record.assignedIC,
        mine: record.assignedIC.includes(uid),
        done: h.status === 'Completed',
      }))
      return [...fixture, ...listed]
    })
  }, [myAssignedCases, flowFor, currentUser?.id])

  const byDay = useMemo(() => {
    const map = new Map<string, Sitting[]>()
    for (const s of sittings) {
      const k = s.at.slice(0, 10)
      map.set(k, [...(map.get(k) ?? []), s])
    }
    for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at))
    return map
  }, [sittings])

  // Grid starts on the Monday on or before the 1st, and always runs six weeks so the
  // page height does not jump between months.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(first.getDate() - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const selectedSittings = selected ? (byDay.get(selected) ?? []) : []
  const monthLabel = cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const upcomingAll = sittings
    .filter((s) => !s.done && s.at.slice(0, 10) >= key(today))
    .sort((a, b) => a.at.localeCompare(b.at))

  const step = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Hearing calendar</h1>
          <p>
            Every sitting on the cases you sit on. Sittings you are named to attend are shown in
            green; the rest of the panel’s are shown for context.
          </p>
        </div>
        <span className="meta-pill">
          {upcomingAll.length} upcoming · {sittings.length} in total
        </span>
      </div>

      <div className="ep-grid">
        {/* ── Month grid ───────────────────────────────────────── */}
        <section className="ep-card">
          <div className="ep-card-body">
            <div className="ep-cal-head">
              <span className="ep-cal-month">{monthLabel}</span>
              <div className="ep-cal-nav">
                <button type="button" className="btn btn-secondary" onClick={() => step(-1)} aria-label="Previous month">
                  <ChevronLeft {...ICON} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
                    setSelected(key(today))
                  }}
                >
                  Today
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => step(1)} aria-label="Next month">
                  <ChevronRight {...ICON} />
                </button>
              </div>
            </div>

            <div className="ep-cal-grid">
              {DOW.map((d) => (
                <div key={d} className="ep-cal-dow">
                  {d}
                </div>
              ))}
              {cells.map((d) => {
                const k = key(d)
                const list = byDay.get(k) ?? []
                const outside = d.getMonth() !== cursor.getMonth()
                const isToday = k === key(today)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelected(k)}
                    className={`ep-cal-cell${outside ? ' outside' : ''}${isToday ? ' today' : ''}${
                      selected === k ? ' selected' : ''
                    }`}
                  >
                    <span className="ep-cal-num">{d.getDate()}</span>
                    {list.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className={`ep-cal-chip${s.done ? ' done' : s.mine ? ' mine' : ''}`}
                        title={`${s.title} — ${s.caseId}`}
                      >
                        {s.at.slice(11, 16)} {s.caseId.slice(-4)}
                      </span>
                    ))}
                    {list.length > 3 ? (
                      <span className="ep-cal-num">+{list.length - 3} more</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Day detail + what's next ─────────────────────────── */}
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
                  {selectedSittings.map((s) => (
                    <div key={s.id} style={{ borderLeft: '2px solid var(--color-accent)', paddingLeft: 12 }}>
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
                        {s.mine ? (
                          <span className="badge badge-completed">You attend</span>
                        ) : (
                          <span className="badge badge-low">Panel</span>
                        )}
                        {s.done ? <span className="badge badge-closed">Held</span> : null}
                      </div>
                    </div>
                  ))}
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
    </div>
  )
}
