import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Download, MapPin, Users } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { FigureTile } from '../components/workflow/Dials'
import { sittingQuorumTests, allMet } from '../lib/workflow/quorum'
import { hearingsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import { downloadIcs } from '../lib/calendar/sittings'
import { useToast } from '../lib/toast'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'
import '../components/calendar/CalendarExtras.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

interface Sitting {
  id: string
  caseId: string
  at: string
  title: string
  where: string
  attendees: string[]
  done: boolean
  short: boolean
}

/**
 * Hearings calendar, administrator scope.
 *
 * The member's calendar shows the sittings they sit on; this one shows every sitting in
 * the organisation and can list new ones. The bench test travels with each entry, because
 * an administrator scheduling a sitting into a week where the external member is already
 * committed twice is how sittings end up adjourned for want of quorum.
 */
export function HearingsAdminPage() {
  const { allCases, flowFor, scheduleHearing } = useWorkflow()
  const { push } = useToast()

  const today = new Date(dateNDaysAgo(0) + 'T00:00:00')
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<string | null>(key(today))
  const [scheduling, setScheduling] = useState(false)
  const [form, setForm] = useState({
    caseId: '',
    date: '',
    time: '11:00',
    mode: 'In person' as 'In person' | 'Video conference',
    location: '',
    agenda: '',
  })

  const pairs = useMemo(
    () =>
      allCases
        .map((record) => ({ record, flow: flowFor(record.id) }))
        .filter((p): p is { record: (typeof allCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!p.flow),
    [allCases, flowFor],
  )

  const schedulable = pairs.filter((p) => !isWorkflowTerminal(p.flow.stage))

  const sittings = useMemo<Sitting[]>(
    () =>
      pairs.flatMap(({ record, flow }) => [
        ...hearingsFor(record.id).map((h) => ({
          id: h.id,
          caseId: record.id,
          at: h.at,
          title: h.title,
          where: h.location,
          attendees: h.attendeeIds,
          done: h.status === 'Completed' || h.status === 'Adjourned',
          short: !allMet(sittingQuorumTests(h.attendeeIds)),
        })),
        ...flow.hearings.map((h) => ({
          id: h.id,
          caseId: record.id,
          at: h.at,
          title: h.agenda,
          where: h.location,
          attendees: record.assignedIC,
          done: h.status === 'Completed',
          short: !allMet(sittingQuorumTests(record.assignedIC)),
        })),
      ]),
    [pairs],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, Sitting[]>()
    for (const s of sittings) {
      const k = s.at.slice(0, 10)
      map.set(k, [...(map.get(k) ?? []), s])
    }
    for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at))
    return map
  }, [sittings])

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

  const upcoming = sittings.filter((s) => !s.done && s.at.slice(0, 10) >= key(today))
  const shortBench = upcoming.filter((s) => s.short)
  const thisMonth = sittings.filter(
    (s) => s.at.slice(0, 7) === `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
  )

  const selectedSittings = selected ? (byDay.get(selected) ?? []) : []
  const monthLabel = cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const step = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))

  const save = () => {
    if (!form.caseId || !form.date) return
    const record = allCases.find((c) => c.id === form.caseId)
    scheduleHearing(form.caseId, {
      at: `${form.date}T${form.time}:00`,
      mode: form.mode,
      location: form.location.trim() || `${record?.location ?? 'Head office'} — Committee room`,
      agenda: form.agenda.trim() || 'Examination of the parties.',
    })
    setScheduling(false)
    setSelected(form.date)
    setCursor(new Date(form.date + 'T00:00:00'))
    setForm({ caseId: '', date: '', time: '11:00', mode: 'In person', location: '', agenda: '' })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Hearings calendar</h1>
          <p>
            Every sitting across the caseload, and where to list a new one. Entries whose bench
            would be short of s.4 are marked before the day, not after it.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!scheduling && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  downloadIcs(
                    sittings
                      .filter((s) => !s.done)
                      .map((s) => ({
                        ...s,
                        durationMinutes: 90,
                        source: 'fixture' as const,
                      })),
                    'sentinel-hearings.ics',
                    'Sentinel — hearings',
                  )
                  push('Calendar file downloaded.', 'success')
                }}
              >
                <Download {...ICON} />
                Export .ics
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setScheduling(true)}>
                <CalendarPlus {...ICON} />
                Schedule a session
              </button>
            </>
          )}
        </div>
      </div>

      <div className="figure-grid">
        <FigureTile label="Sittings ahead" value={upcoming.length} meta="Across the whole caseload" />
        <FigureTile
          label="Bench would be short"
          value={shortBench.length}
          tone={shortBench.length ? 'warning' : undefined}
          meta="Reconstitute or adjourn before the day"
        />
        <FigureTile label="This month" value={thisMonth.length} meta={monthLabel} />
        <FigureTile label="Held to date" value={sittings.filter((s) => s.done).length} meta="Concluded or adjourned" />
      </div>

      {/* ── Scheduler ────────────────────────────────────────────── */}
      {scheduling && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <CalendarPlus size={15} strokeWidth={1.5} />
              List a sitting
            </span>
          </div>
          <div className="ep-card-body">
            <div className="wf-form">
              <div className="wf-form-row">
                <label className="wf-field">
                  Case
                  <select
                    className="select"
                    value={form.caseId}
                    onChange={(e) => setForm({ ...form, caseId: e.target.value })}
                  >
                    <option value="">Choose a case…</option>
                    {schedulable.map(({ record, flow }) => (
                      <option key={record.id} value={record.id}>
                        {record.id} — {STAGE_META[flow.stage].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wf-field">
                  Date
                  <input
                    className="input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label className="wf-field">
                  Time
                  <input
                    className="input"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </label>
                <label className="wf-field">
                  Mode
                  <select
                    className="select"
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value as typeof form.mode })}
                  >
                    <option>In person</option>
                    <option>Video conference</option>
                  </select>
                </label>
              </div>
              <label className="wf-field">
                Venue
                <input
                  className="input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Committee room, or a video bridge"
                />
              </label>
              <label className="wf-field">
                Agenda
                <textarea
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  placeholder="Examination of the complainant and the respondent."
                />
              </label>
              <div className="wf-note-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setScheduling(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={save} disabled={!form.caseId || !form.date}>
                  List sitting
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

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
                        className={`ep-cal-chip${s.done ? ' done' : s.short ? ' short' : ' mine'}`}
                        title={`${s.title} — ${s.caseId}${s.short ? ' (bench short)' : ''}`}
                      >
                        {s.at.slice(11, 16)} {s.caseId.slice(-4)}
                        {s.short ? ' !' : ''}
                      </span>
                    ))}
                    {list.length > 3 ? <span className="ep-cal-num">+{list.length - 3} more</span> : null}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Day detail ───────────────────────────────────────── */}
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
                    <div
                      key={s.id}
                      style={{
                        borderLeft: `2px solid ${s.short ? 'var(--color-warning)' : 'var(--color-accent)'}`,
                        paddingLeft: 12,
                      }}
                    >
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
                        {s.done ? (
                          <span className="badge badge-closed">Held</span>
                        ) : s.short ? (
                          <span className="badge badge-medium">Bench short</span>
                        ) : (
                          <span className="badge badge-completed">Bench valid</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {shortBench.length > 0 && (
            <section className="ep-card" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
              <div className="ep-card-head">
                <span className="ep-card-title">Benches to reconstitute</span>
                <span className="badge badge-medium">{shortBench.length}</span>
              </div>
              <div className="ep-card-body tight">
                {shortBench.slice(0, 6).map((s) => (
                  <div key={s.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="ep-doc-name">{s.title}</div>
                      <div className="ep-doc-meta">
                        <span className="mono">{s.caseId}</span> · {formatTimestamp(s.at)}
                      </div>
                    </div>
                    <span className="badge badge-medium">Short</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
