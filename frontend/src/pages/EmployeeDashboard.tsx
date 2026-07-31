import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  FileText,
  FolderOpen,
  LifeBuoy,
  Lock,
  Plus,
  Users,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { StageTracker } from '../components/workflow/StageTracker'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { MyCommittee } from '../components/workflow/MyCommittee'
import { hearingsFor } from '../lib/data/caseDetail'
import { hasLiveInquiryClock } from '../lib/data/cases'
import { formatDate, formatTimestamp } from '../lib/format'
import { dateNDaysAgo } from '../lib/data/statutory'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The complainant's home screen.
 *
 * Deliberately not the compliance command centre. That screen answers "how is the
 * organisation doing"; this one answers "what is happening to me, and what do I do
 * next". It shows exactly one person's cases and nothing about anyone else's.
 */
export function EmployeeDashboardPage() {
  const { visibleCases, flowFor, myNotifications, unreadCount } = useWorkflow()
  const { currentUser } = useRole()

  const withFlow = visibleCases
    .map((c) => ({ record: c, flow: flowFor(c.id) }))
    .filter((x): x is { record: (typeof visibleCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!x.flow)

  const active = withFlow.filter((x) => !isWorkflowTerminal(x.flow.stage))
  const past = withFlow.filter((x) => isWorkflowTerminal(x.flow.stage))
  const primary = active[0] ?? withFlow[0]

  const today = dateNDaysAgo(0)

  // Sittings still ahead, across every case of theirs. Fixture hearings and any listed
  // through the workflow are merged so the list is complete either way.
  const upcoming = withFlow
    .flatMap(({ record, flow }) => [
      ...hearingsFor(record.id)
        .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
        .map((h) => ({ caseId: record.id, at: h.at, title: h.title, where: h.location, kind: h.type })),
      ...flow.hearings
        .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
        .map((h) => ({ caseId: record.id, at: h.at, title: h.agenda, where: h.location, kind: h.mode })),
    ])
    .sort((a, b) => a.at.localeCompare(b.at))

  const recentNotices = myNotifications.slice(0, 4)

  if (!primary) {
    return (
      <div className="flex flex-col gap-5">
        <div className="ep-hero">
          <div>
            <div className="ep-hero-greeting">Welcome, {currentUser?.name.split(' ')[0]}</div>
            <p className="ep-hero-sub">
              You have no complaint on record. If something has happened at work that you want the
              Internal Committee to look at, you can file confidentially here.
            </p>
          </div>
          <div className="ep-hero-actions">
            <Link to="/complaint/new" className="btn btn-primary">
              <Plus {...ICON} />
              File a complaint
            </Link>
            <Link to="/help" className="btn btn-secondary">
              <LifeBuoy {...ICON} />
              Help centre
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { record, flow } = primary
  const liveClock = hasLiveInquiryClock(record)

  return (
    <div className="flex flex-col gap-5">
      {/* ── Greeting + quick actions ───────────────────────────── */}
      <div className="ep-hero">
        <div style={{ minWidth: 0 }}>
          <div className="ep-hero-greeting">Welcome, {currentUser?.name.split(' ')[0]}</div>
          <p className="ep-hero-sub">
            {active.length
              ? `Your complaint ${record.id} is at “${STAGE_META[flow.stage].label}”. ${STAGE_META[flow.stage].description}`
              : 'You have no active complaint. Your closed cases are listed below.'}
          </p>
        </div>
        <div className="ep-hero-actions">
          <Link to="/my-complaints" className="btn btn-primary">
            Track my complaint
            <ArrowRight {...ICON} />
          </Link>
          <Link to="/complaint/new" className="btn btn-secondary">
            <Plus {...ICON} />
            New complaint
          </Link>
        </div>
      </div>

      {/* ── Four figures that matter to one person ─────────────── */}
      <div className="ep-stats">
        <div className="ep-stat">
          <div className="ep-stat-label">Current stage</div>
          <div className="ep-stat-value" style={{ fontSize: 'var(--text-lg)', marginTop: 12 }}>
            {STAGE_META[flow.stage].label}
          </div>
          <div className="ep-stat-meta">Step {STAGE_META[flow.stage].step} of 21</div>
        </div>
        <div className="ep-stat">
          <div className="ep-stat-label">Days since filing</div>
          <div className="ep-stat-value">{record.daysElapsed}</div>
          <div className="ep-stat-meta">Filed {formatDate(record.filedDate)}</div>
        </div>
        <div className="ep-stat">
          <div className="ep-stat-label">Inquiry deadline</div>
          <div
            className="ep-stat-value"
            style={{
              color: !liveClock
                ? 'var(--color-secondary-text)'
                : record.isBreached
                  ? 'var(--color-danger)'
                  : record.daysRemaining <= 7
                    ? 'var(--color-warning)'
                    : 'var(--color-accent)',
            }}
          >
            {liveClock ? (record.isBreached ? 'Overdue' : record.daysRemaining) : '—'}
          </div>
          <div className="ep-stat-meta">
            {liveClock ? 'days left of the 90-day window (s.11(4))' : 'The inquiry clock has stopped'}
          </div>
        </div>
        <div className="ep-stat">
          <div className="ep-stat-label">Unread notices</div>
          <div className="ep-stat-value">{unreadCount}</div>
          <div className="ep-stat-meta">
            {upcoming.length} hearing{upcoming.length === 1 ? '' : 's'} ahead
          </div>
        </div>
      </div>

      <div className="ep-grid">
        {/* ── Left column ──────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Progress */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <FileText size={15} strokeWidth={1.5} />
                Your complaint progress
              </span>
              <Link to="/my-complaints" className="text-13" style={{ color: 'var(--color-accent)' }}>
                Full history
              </Link>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <StageTracker stage={flow.stage} />
              <div>
                <div className="cw-section-label" style={{ marginBottom: 12 }}>
                  What you can do now
                </div>
                <ActionPanel caseId={record.id} />
              </div>
            </div>
          </section>

          {/* Upcoming hearings */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <CalendarDays size={15} strokeWidth={1.5} />
                Upcoming hearings
              </span>
              <span className="meta-pill">{upcoming.length}</span>
            </div>
            <div className="ep-card-body tight">
              {upcoming.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  No sitting is listed for you at the moment. You will be given notice before any
                  hearing you are required to attend.
                </p>
              ) : (
                upcoming.map((h, i) => {
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
                        <div className="ep-hearing-meta">
                          {h.kind} · {h.caseId}
                        </div>
                      </div>
                      <span className="badge badge-scheduled">Scheduled</span>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Past cases */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <FolderOpen size={15} strokeWidth={1.5} />
                Your past cases
              </span>
              <span className="meta-pill">{past.length}</span>
            </div>
            <div className="ep-card-body">
              {past.length === 0 ? (
                <p className="text-13 text-muted">
                  You have no closed or archived cases. Once a case is decided and sealed it moves
                  here, and the outcome stays available to you.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {past.map(({ record: r, flow: f }) => (
                    <div key={r.id} className="ep-past">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Link to={`/cases/${r.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                            {r.id}
                          </Link>
                          <span className="badge badge-closed">{STAGE_META[f.stage].label}</span>
                        </div>
                        <div className="text-12 text-muted" style={{ marginTop: 4 }}>
                          Filed {formatDate(r.filedDate)}
                          {f.finalDecision ? ` · Outcome: ${f.finalDecision.outcome}` : ''}
                        </div>
                      </div>
                      <Link to={`/cases/${r.id}`} className="btn btn-secondary">
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Right column ─────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Committee */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Users size={15} strokeWidth={1.5} />
                Your Internal Committee
              </span>
            </div>
            <div className="ep-card-body">
              <MyCommittee caseId={record.id} compact />
              <Link
                to="/my-complaints"
                className="text-13"
                style={{ color: 'var(--color-accent)', display: 'inline-block', marginTop: 'var(--space-3)' }}
              >
                Full committee details
              </Link>
            </div>
          </section>

          {/* Notifications */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Bell size={15} strokeWidth={1.5} />
                Notifications
              </span>
              <Link to="/notifications" className="text-13" style={{ color: 'var(--color-accent)' }}>
                All
              </Link>
            </div>
            <div className="ep-card-body tight">
              {recentNotices.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing new.
                </p>
              ) : (
                recentNotices.map((n) => (
                  <div key={n.id} className="ep-hearing" style={{ gridTemplateColumns: '8px 1fr' }}>
                    <span className={`wf-notice-dot ${n.read ? 'read' : ''}`} style={{ marginTop: 6 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="ep-hearing-title">{n.title}</div>
                      <div className="ep-hearing-meta">{n.detail}</div>
                      <div className="ep-hearing-meta">{formatTimestamp(n.at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Shortcuts */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">Quick links</span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Link to="/my-documents" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <FolderOpen {...ICON} />
                My documents
              </Link>
              <Link to="/help" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <LifeBuoy {...ICON} />
                Help centre
              </Link>
              <Link to="/my-profile" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Users {...ICON} />
                My profile
              </Link>
            </div>
          </section>
        </div>
      </div>

      <p className="ep-confidential">
        <Lock size={12} strokeWidth={2} />
        You are seeing only your own case. The respondent’s identity is withheld from this view, and
        every access to your file is recorded in the audit trail.
      </p>
    </div>
  )
}
