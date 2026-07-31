import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ScrollText, XCircle } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { QuorumRing, QuorumList } from '../components/workflow/Dials'
import { sittingQuorumTests, allMet } from '../lib/workflow/quorum'
import { hearingsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

type Scope = 'Ahead' | 'Held' | 'All'

/**
 * The cause list.
 *
 * A court's cause list is the day's sittings in order, and that is exactly what a
 * Presiding Officer needs the morning of a hearing. Each entry carries its own bench
 * test, because "is this sitting properly constituted" is a question that has to be
 * answered before the sitting, not discovered afterwards.
 */
export function CauseListPage() {
  const { myAssignedCases, flowFor } = useWorkflow()
  const [scope, setScope] = useState<Scope>('Ahead')
  const [open, setOpen] = useState<string | null>(null)

  const today = dateNDaysAgo(0)

  const all = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)
    .flatMap(({ record, flow }) => [
      ...hearingsFor(record.id).map((h) => ({
        id: h.id,
        caseId: record.id,
        at: h.at,
        title: h.title,
        type: h.type as string,
        where: h.location,
        attendees: h.attendeeIds,
        status: h.status,
        minuted: h.minutesRecorded,
        stage: flow.stage,
        daysRemaining: record.daysRemaining,
        breached: record.isBreached,
        terminal: isWorkflowTerminal(flow.stage),
      })),
      ...flow.hearings.map((h) => ({
        id: h.id,
        caseId: record.id,
        at: h.at,
        title: h.agenda,
        type: h.mode as string,
        where: h.location,
        attendees: record.assignedIC,
        status: h.status as string,
        minuted: !!h.minutes,
        stage: flow.stage,
        daysRemaining: record.daysRemaining,
        breached: record.isBreached,
        terminal: isWorkflowTerminal(flow.stage),
      })),
    ])
    .sort((a, b) => a.at.localeCompare(b.at))

  const ahead = all.filter((s) => s.status === 'Scheduled' && s.at.slice(0, 10) >= today)
  const held = all.filter((s) => !(s.status === 'Scheduled' && s.at.slice(0, 10) >= today))
  const rows = scope === 'Ahead' ? ahead : scope === 'Held' ? held : all

  // Grouped by date, the way a cause list is actually posted.
  const byDate = rows.reduce<Record<string, typeof rows>>((acc, s) => {
    ;(acc[s.at.slice(0, 10)] ??= []).push(s)
    return acc
  }, {})

  const defective = ahead.filter((s) => !allMet(sittingQuorumTests(s.attendees))).length

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Cause list</h1>
          <p>
            Sittings before you, in order, each with its bench tested against s.4. A sitting that is
            short cannot safely proceed — the finding can be set aside however sound it is.
          </p>
        </div>
        <div className="ep-segment">
          {(['Ahead', 'Held', 'All'] as Scope[]).map((s) => (
            <button key={s} type="button" className={scope === s ? 'active' : ''} onClick={() => setScope(s)}>
              {s} ({s === 'Ahead' ? ahead.length : s === 'Held' ? held.length : all.length})
            </button>
          ))}
        </div>
      </div>

      {defective > 0 && scope !== 'Held' && (
        <div className="wf-blocked" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
          <XCircle size={14} strokeWidth={1.5} style={{ color: 'var(--color-warning)', marginTop: 1, flexShrink: 0 }} />
          <span>
            <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
              {defective} listed sitting{defective === 1 ? '' : 's'} would sit short.
            </strong>{' '}
            Open the entry to see which condition fails, and adjourn or reconstitute before the day.
          </span>
        </div>
      )}

      {Object.keys(byDate).length === 0 ? (
        <div className="wf-empty">Nothing listed in this view.</div>
      ) : (
        Object.entries(byDate).map(([date, sittings]) => (
          <section key={date} className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ScrollText size={15} strokeWidth={1.5} />
                {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="meta-pill">
                {sittings.length} sitting{sittings.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {sittings.map((s) => {
                const tests = sittingQuorumTests(s.attendees)
                const ok = allMet(tests)
                const expanded = open === s.id
                const urgent = !s.terminal && (s.breached || s.daysRemaining <= 14)

                return (
                  <div key={s.id}>
                    <button
                      type="button"
                      className={`bench-row${urgent ? ' urgent' : ''}`}
                      style={{ width: '100%', textAlign: 'left' }}
                      onClick={() => setOpen(expanded ? null : s.id)}
                      aria-expanded={expanded}
                    >
                      <div className="bench-time">
                        <div className="bench-hour">{s.at.slice(11, 16)}</div>
                        <div className="bench-date">{s.type.slice(0, 10)}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ep-hearing-title">{s.title}</div>
                        <div className="ep-hearing-meta">
                          <span className="mono" style={{ color: 'var(--color-accent)' }}>
                            {s.caseId}
                          </span>{' '}
                          · {STAGE_META[s.stage].label} · {s.where}
                        </div>
                        <div className="ep-hearing-meta">{s.attendees.map(actorName).join(', ')}</div>
                      </div>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        <span className={`badge ${ok ? 'badge-completed' : 'badge-medium'}`}>
                          {ok ? (
                            <>
                              <CheckCircle2 size={11} strokeWidth={2} style={{ marginRight: 4 }} />
                              Bench valid
                            </>
                          ) : (
                            <>
                              <XCircle size={11} strokeWidth={2} style={{ marginRight: 4 }} />
                              Bench short
                            </>
                          )}
                        </span>
                        {urgent ? (
                          <span className="badge badge-overdue">
                            {s.breached ? 'Past 90 days' : `${s.daysRemaining}d left`}
                          </span>
                        ) : null}
                        {s.minuted ? <span className="badge badge-low">Minuted</span> : null}
                      </span>
                    </button>

                    {expanded && (
                      <div
                        className="rise"
                        style={{
                          display: 'flex',
                          gap: 'var(--space-6)',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          padding: 'var(--space-5)',
                          margin: '2px 0 var(--space-2)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-raised)',
                        }}
                      >
                        <QuorumRing tests={tests} size={116} />
                        <div style={{ minWidth: 240, flex: 1 }}>
                          <QuorumList tests={tests} />
                        </div>
                        <div style={{ minWidth: 180 }}>
                          <div className="ep-field-label">Sitting</div>
                          <div className="text-12 text-muted" style={{ marginTop: 4 }}>
                            {formatTimestamp(s.at)}
                          </div>
                          <div className="text-12 text-muted">{s.where}</div>
                          <Link
                            to={`/cases/${s.caseId}`}
                            className="btn btn-secondary"
                            style={{ marginTop: 12 }}
                          >
                            Open case
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      <p className="ep-confidential">
        <ScrollText size={12} strokeWidth={2} />
        Listing as at {formatDate(today)}. Adjournments and reconstitutions are recorded against the
        case and appear in the annual return.
      </p>
    </div>
  )
}
