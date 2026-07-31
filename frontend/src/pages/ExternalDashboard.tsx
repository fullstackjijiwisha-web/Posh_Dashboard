import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Gavel,
  Scale,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { AdvisoryPanel } from '../components/workflow/AdvisoryPanel'
import { hearingsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The External Member's oversight home.
 *
 * This role is on the panel because s.4(2)(c) requires somebody from outside the
 * company, and the whole value of that seat is independence. So this screen is built
 * around what an outside adviser actually needs to answer — how many inquiries am I
 * carrying, where are they, when do I next sit, and what have I put on the record —
 * rather than around the organisation's compliance posture, which is not their concern.
 */
export function ExternalDashboardPage() {
  const { myAssignedCases, flowFor, myNotifications, unreadCount } = useWorkflow()
  const { currentUser } = useRole()

  const today = dateNDaysAgo(0)

  const rows = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)

  const active = rows.filter((r) => !isWorkflowTerminal(r.flow.stage))
  const decided = rows.filter((r) => r.flow.finalDecision || isWorkflowTerminal(r.flow.stage))

  // Sittings ahead across every case they sit on.
  const upcoming = rows
    .flatMap(({ record, flow }) => [
      ...hearingsFor(record.id)
        .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
        .map((h) => ({ caseId: record.id, at: h.at, title: h.title, where: h.location, mine: h.attendeeIds.includes(currentUser?.id ?? '') })),
      ...flow.hearings
        .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
        .map((h) => ({ caseId: record.id, at: h.at, title: h.agenda, where: h.location, mine: true })),
    ])
    .sort((a, b) => a.at.localeCompare(b.at))

  // Recommendations on their cases waiting to be settled.
  const pendingRecs = rows.filter(
    (r) =>
      ['minutes_recorded', 'recommendation_submitted', 'recommendation_review', 'recommendation_returned'].includes(
        r.flow.stage,
      ),
  )

  const breaching = active.filter((r) => r.record.isBreached || r.record.daysRemaining <= 7)

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="ep-hero">
        <div style={{ minWidth: 0 }}>
          <div className="ep-hero-greeting">
            {currentUser?.name}
            <span
              className="badge"
              style={{ marginLeft: 12, background: 'rgba(167,139,250,0.14)', color: '#c4b5fd', verticalAlign: 'middle' }}
            >
              External Member
            </span>
          </div>
          <p className="ep-hero-sub">
            {currentUser?.designation}. You are independent of this company — your seat exists so the
            inquiry is not decided wholly from inside it. You are overseeing {active.length} active
            {active.length === 1 ? ' inquiry' : ' inquiries'}.
          </p>
        </div>
        <div className="ep-hero-actions">
          <Link to="/assigned-cases" className="btn btn-primary">
            Assigned cases
            <ArrowRight {...ICON} />
          </Link>
          <Link to="/hearing-calendar" className="btn btn-secondary">
            <CalendarDays {...ICON} />
            Calendar
          </Link>
        </div>
      </div>

      {/* ── Oversight figures ────────────────────────────────────── */}
      <div className="ep-stats">
        <div className="ep-stat">
          <div className="ep-stat-label">Cases overseeing</div>
          <div className="ep-stat-value">{active.length}</div>
          <div className="ep-stat-meta">{rows.length} in total, including concluded</div>
        </div>
        <div className="ep-stat">
          <div className="ep-stat-label">Scheduled hearings</div>
          <div className="ep-stat-value">{upcoming.length}</div>
          <div className="ep-stat-meta">
            {upcoming.length ? `Next on ${formatDate(upcoming[0].at)}` : 'Nothing listed'}
          </div>
        </div>
        <div className="ep-stat">
          <div className="ep-stat-label">Decisions completed</div>
          <div className="ep-stat-value">{decided.length}</div>
          <div className="ep-stat-meta">Findings recorded and acted on</div>
        </div>
        <div className="ep-stat">
          <div className="ep-stat-label">Awaiting recommendation</div>
          <div
            className="ep-stat-value"
            style={{ color: pendingRecs.length ? 'var(--color-warning)' : undefined }}
          >
            {pendingRecs.length}
          </div>
          <div className="ep-stat-meta">
            {breaching.length ? `${breaching.length} near or past the 90-day limit` : 'All within the inquiry window'}
          </div>
        </div>
      </div>

      <div className="ep-grid">
        {/* ── Left ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Oversight cases */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Gavel size={15} strokeWidth={1.5} />
                Oversight cases
              </span>
              <Link to="/assigned-cases" className="text-13" style={{ color: 'var(--color-accent)' }}>
                All {rows.length}
              </Link>
            </div>
            <div className="ep-card-body tight">
              {active.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  You are not carrying any active inquiry.
                </p>
              ) : (
                active.slice(0, 6).map(({ record, flow }) => {
                  const urgent = record.isBreached || record.daysRemaining <= 7
                  return (
                    <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Link
                            to={`/cases/${record.id}`}
                            className="mono text-13"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {record.id}
                          </Link>
                          <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                          {urgent ? (
                            <span className="badge badge-overdue">
                              {record.isBreached ? 'Breached' : `${record.daysRemaining}d left`}
                            </span>
                          ) : null}
                        </div>
                        <div className="ep-doc-meta">
                          {record.department} · {record.location} · Day {record.daysElapsed} of 90
                        </div>
                      </div>
                      <span className="ep-doc-meta" style={{ whiteSpace: 'nowrap' }}>
                        {flow.hearings.length + hearingsFor(record.id).length} sittings
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Case Advisory Panel */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ShieldCheck size={15} strokeWidth={1.5} />
                Case Advisory Panel
              </span>
              <span className="meta-pill">independent observations</span>
            </div>
            <div className="ep-card-body">
              <p className="text-12 text-muted" style={{ marginBottom: 'var(--space-4)', lineHeight: 1.6, maxWidth: '78ch' }}>
                Observations you record here sit on the case file permanently. They do not advance
                the inquiry and cannot be removed by the panel or an administrator — flagging one as
                a concern notifies the Presiding Officer and the POSH Admin immediately.
              </p>
              <AdvisoryPanel caseIds={active.map((r) => r.record.id)} limit={4} />
            </div>
          </section>
        </div>

        {/* ── Right ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Upcoming sittings */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <CalendarDays size={15} strokeWidth={1.5} />
                Next sittings
              </span>
              <Link to="/hearing-calendar" className="text-13" style={{ color: 'var(--color-accent)' }}>
                Calendar
              </Link>
            </div>
            <div className="ep-card-body tight">
              {upcoming.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  No sitting is listed.
                </p>
              ) : (
                upcoming.slice(0, 5).map((h, i) => {
                  const d = new Date(h.at)
                  return (
                    <div key={`${h.caseId}-${i}`} className="ep-hearing">
                      <div className="ep-hearing-date">
                        <div className="ep-hearing-day">{d.getDate()}</div>
                        <div className="ep-hearing-month">
                          {d.toLocaleString('en-IN', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ep-hearing-title">{h.title}</div>
                        <div className="ep-hearing-meta">
                          {formatTimestamp(h.at)} · {h.where}
                        </div>
                        <div className="ep-hearing-meta">{h.caseId}</div>
                      </div>
                      {h.mine ? (
                        <span className="badge badge-completed">You attend</span>
                      ) : (
                        <span className="badge badge-low">Panel</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Recommendations awaiting */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Scale size={15} strokeWidth={1.5} />
                Recommendations
              </span>
              <Link to="/ic-recommendations" className="text-13" style={{ color: 'var(--color-accent)' }}>
                Centre
              </Link>
            </div>
            <div className="ep-card-body tight">
              {pendingRecs.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing awaiting a recommendation.
                </p>
              ) : (
                pendingRecs.map(({ record, flow }) => (
                  <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="ep-doc-name mono">{record.id}</div>
                      <div className="ep-doc-meta">{STAGE_META[flow.stage].label}</div>
                    </div>
                    <Link to="/ic-recommendations" className="btn btn-secondary">
                      Open
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Notifications */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Bell size={15} strokeWidth={1.5} />
                Notifications
              </span>
              {unreadCount ? <span className="badge badge-completed">{unreadCount} new</span> : null}
            </div>
            <div className="ep-card-body tight">
              {myNotifications.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing new.
                </p>
              ) : (
                myNotifications.slice(0, 4).map((n) => (
                  <div key={n.id} className="ep-hearing" style={{ gridTemplateColumns: '8px 1fr' }}>
                    <span className={`wf-notice-dot ${n.read ? 'read' : ''}`} style={{ marginTop: 6 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="ep-hearing-title">{n.title}</div>
                      <div className="ep-hearing-meta">{n.detail}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Panel colleagues */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Users size={15} strokeWidth={1.5} />
                Your panel
              </span>
            </div>
            <div className="ep-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[...new Set(rows.flatMap((r) => r.record.assignedIC))]
                  .filter((id) => id !== currentUser?.id)
                  .map((id) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar sm">{actorName(id).split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                      <span className="text-13">{actorName(id)}</span>
                    </div>
                  ))}
              </div>
              <Link
                to="/my-profile"
                className="text-13"
                style={{ color: 'var(--color-accent)', display: 'inline-block', marginTop: 'var(--space-4)' }}
              >
                My seat and declarations
              </Link>
            </div>
          </section>
        </div>
      </div>

      <p className="ep-confidential">
        <ScrollText size={12} strokeWidth={2} />
        You see only the cases you sit on. Every file you open is recorded in the audit trail under
        your name.
      </p>
    </div>
  )
}
