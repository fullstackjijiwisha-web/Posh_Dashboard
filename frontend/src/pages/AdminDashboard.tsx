import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileInput,
  Gauge,
  Inbox,
  ListChecks,
  PieChart as PieIcon,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { ROLE_LABEL } from '../lib/data/types'
import { CoverageRing, FigureTile, SparkBars } from '../components/workflow/Dials'
import { TrendChart, StatusDonut, SliceLegend } from '../components/workflow/Charts'
import { constitutionTests, allMet } from '../lib/workflow/quorum'
import {
  monthlyTrend,
  statusBreakdown,
  slaHealth,
  medianDaysToClosure,
  type FlowPair,
} from '../lib/workflow/analytics'
import { ANNUAL_REPORT } from '../data/annualReport'
import { HEARINGS, ACTIONS, hearingsFor } from '../lib/data/caseDetail'
import { AUDIT_LOG } from '../lib/data/audit'
import { dateNDaysAgo } from '../lib/data/statutory'
import { actorName, actorInitials } from '../lib/data/users'
import { formatDate, formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The POSH Administrator's console.
 *
 * This is the one role that owns the process end to end, so this is the one screen that
 * is allowed to be dense. The ordering is deliberate and is not "most interesting
 * first": compliance posture, then the trend, then where the caseload actually sits,
 * then the queues that need a person today. An administrator opens this to answer
 * "is anything on fire, and what do I do first" — everything analytical is below that.
 */
export function AdminDashboardPage() {
  const { allCases, flowFor, committees, admins, unreadCount } = useWorkflow()
  const { currentUser, currentRole } = useRole()

  const today = dateNDaysAgo(0)

  const pairs = useMemo<FlowPair[]>(
    () =>
      allCases
        .map((record) => ({ record, flow: flowFor(record.id) }))
        .filter((p): p is FlowPair => !!p.flow),
    [allCases, flowFor],
  )

  const trend = useMemo(() => monthlyTrend(allCases), [allCases])
  const breakdown = useMemo(() => statusBreakdown(pairs), [pairs])
  const sla = useMemo(() => slaHealth(allCases), [allCases])
  const median = useMemo(() => medianDaysToClosure(allCases), [allCases])

  const open = pairs.filter((p) => !isWorkflowTerminal(p.flow.stage))
  const breached = allCases.filter((c) => c.isBreached)
  const dueSoon = open.filter((p) => !p.record.isBreached && p.record.daysRemaining <= 7)

  // Queues that need the administrator specifically.
  const awaitingScreening = pairs.filter((p) =>
    ['complaint_submitted', 'complaint_under_review'].includes(p.flow.stage),
  )
  const awaitingDocket = pairs.filter((p) => p.flow.stage === 'complaint_accepted')
  const awaitingBoard = pairs.filter((p) => p.flow.stage === 'case_created')
  const awaitingAudit = pairs.filter((p) =>
    ['recommendation_submitted', 'recommendation_review', 'recommendation_resubmitted'].includes(p.flow.stage),
  )
  const awaitingDecision = pairs.filter((p) => p.flow.stage === 'recommendation_approved')
  const awaitingClosure = pairs.filter((p) =>
    ['final_decision_recorded', 'case_closed', 'feedback_submitted'].includes(p.flow.stage),
  )

  const adminQueue = [
    { label: 'Complaints to screen', n: awaitingScreening.length, to: '/filing-ingest' },
    { label: 'Dockets to open', n: awaitingDocket.length, to: '/filing-ingest' },
    { label: 'Boards to assign', n: awaitingBoard.length, to: '/committee' },
    { label: 'Recommendations to audit', n: awaitingAudit.length, to: '/recommendations' },
    { label: 'Decisions to record', n: awaitingDecision.length, to: '/statutory-workspace' },
    { label: 'Cases to close or archive', n: awaitingClosure.length, to: '/statutory-workspace' },
  ].filter((q) => q.n > 0)

  const totalQueue = adminQueue.reduce((s, q) => s + q.n, 0)

  // Compliance posture — the five things an inspection asks for first.
  const boardsValid = committees.every((b) => allMet(constitutionTests(b.memberIds)))
  const compliance = [
    { label: 'Internal Committee constituted', ok: committees.length > 0 && boardsValid, cite: 's.4' },
    { label: 'Policy and penal consequences displayed', ok: true, cite: 's.19(b)' },
    { label: 'Awareness programme run this year', ok: ANNUAL_REPORT.awarenessWorkshops.count >= 2, cite: 's.19(c)' },
    { label: 'Committee orientation delivered', ok: ANNUAL_REPORT.sensitizationWorkshops.count >= 1, cite: 's.19(c)' },
    { label: 'Inquiries monitored against 90 days', ok: breached.length === 0, cite: 's.19(i)' },
    { label: 'Annual return ready to file', ok: true, cite: 's.21' },
  ]
  const complianceMet = compliance.filter((c) => c.ok).length
  const complianceScore = (complianceMet / compliance.length) * 100

  // Upcoming hearings across the whole caseload.
  const upcoming = open
    .flatMap(({ record, flow }) => [
      ...hearingsFor(record.id)
        .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
        .map((h) => ({ id: h.id, caseId: record.id, at: h.at, title: h.title, where: h.location })),
      ...flow.hearings
        .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
        .map((h) => ({ id: h.id, caseId: record.id, at: h.at, title: h.agenda, where: h.location })),
    ])
    .sort((a, b) => a.at.localeCompare(b.at))

  // Pending tasks across every case, not only the administrator's own.
  const pendingTasks = allCases
    .flatMap((c) => ACTIONS.filter((a) => a.caseId === c.id))
    .filter((a) => a.status !== 'Done')
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
  const overdueTasks = pendingTasks.filter((a) => a.status === 'Overdue')

  // Recent complaints — newest by filing date.
  const recentComplaints = [...pairs]
    .sort((a, b) => b.record.filedDate.localeCompare(a.record.filedDate))
    .slice(0, 6)

  // Recent activity — the audit trail is the honest version of "what just happened".
  const recentActivity = [...AUDIT_LOG].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10)

  const scheduledHearings = HEARINGS.filter((h) => h.status === 'Scheduled').length

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="ep-hero sweep-line">
        <div style={{ minWidth: 0 }}>
          <div className="ep-hero-greeting">
            {currentUser?.name}
            {/* The owner panel shares this console, so the badge names the actual seat
                rather than assuming whoever is looking at it is the administrator. */}
            <span
              className="badge"
              style={{ marginLeft: 12, background: 'rgba(16,185,129,0.14)', color: '#6ee7b7', verticalAlign: 'middle' }}
            >
              {currentRole ? ROLE_LABEL[currentRole] : 'Administrator'}
            </span>
          </div>
          <p className="ep-hero-sub">
            {totalQueue
              ? `${totalQueue} item${totalQueue === 1 ? '' : 's'} are waiting on you across ${adminQueue.length} queue${adminQueue.length === 1 ? '' : 's'}. `
              : 'Nothing is waiting on you. '}
            {breached.length
              ? `${breached.length} inquiry has run past ninety days and is reportable under Rule 8(5).`
              : 'Every inquiry is inside the statutory window.'}
          </p>
        </div>
        <div className="ep-hero-actions">
          <Link to="/filing-ingest" className="btn btn-primary">
            <FileInput {...ICON} />
            Filing ingest
            {awaitingScreening.length ? <span className="nav-badge">{awaitingScreening.length}</span> : null}
          </Link>
          <Link to="/analytics" className="btn btn-secondary">
            <TrendingUp {...ICON} />
            Analytics
          </Link>
        </div>
      </div>

      {/* ── Headline figures ─────────────────────────────────────── */}
      <div className="figure-grid">
        <FigureTile
          label="Open cases"
          value={open.length}
          meta={`${allCases.length} on the register`}
          aside={<SparkBars values={trend.slice(-6).map((t) => t.filed)} />}
        />
        <FigureTile
          label="Past 90 days"
          value={breached.length}
          tone={breached.length ? 'danger' : undefined}
          meta={breached.length ? 'Reportable with a recorded reason' : 'None in breach'}
        />
        <FigureTile
          label="Due within 7 days"
          value={dueSoon.length}
          tone={dueSoon.length ? 'warning' : undefined}
          meta="Inquiry deadline approaching"
        />
        <FigureTile
          label="Median days to conclude"
          value={median}
          meta="Across concluded inquiries · limit 90"
          aside={<SparkBars values={trend.slice(-6).map((t) => t.resolved)} tone="violet" />}
        />
      </div>

      {/* ── Compliance overview + SLA health ─────────────────────── */}
      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <ClipboardCheck size={15} strokeWidth={1.5} />
              Compliance overview
            </span>
            <Link to="/compliance" className="text-13" style={{ color: 'var(--color-accent)' }}>
              Duty register
            </Link>
          </div>
          <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
            <CoverageRing
              value={complianceScore}
              caption="posture"
              tone={complianceScore === 100 ? 'accent' : 'warning'}
              size={132}
            />
            <div style={{ minWidth: 260, flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {compliance.map((c) => (
                <div key={c.label} style={{ display: 'grid', gridTemplateColumns: '16px 1fr auto', gap: 10, alignItems: 'center' }}>
                  {c.ok ? (
                    <CheckCircle2 size={14} strokeWidth={2} style={{ color: 'var(--color-accent)' }} />
                  ) : (
                    <AlertTriangle size={13} strokeWidth={2} style={{ color: 'var(--color-warning)' }} />
                  )}
                  <span style={{ fontSize: 'var(--text-sm)', color: c.ok ? 'var(--color-primary)' : '#fcd34d' }}>
                    {c.label}
                  </span>
                  <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>
                    {c.cite}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Gauge size={15} strokeWidth={1.5} />
              SLA health
            </span>
            <span className="meta-pill">statutory timelines</span>
          </div>
          <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
            <CoverageRing
              value={sla.overall}
              caption="within time"
              tone={sla.overall >= 90 ? 'accent' : sla.overall >= 75 ? 'warning' : 'info'}
              size={132}
            />
            <div style={{ minWidth: 240, flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sla.bands.map((b) => (
                <div key={b.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>{b.label}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-secondary-text)', whiteSpace: 'nowrap' }}>
                      {b.met}/{b.total} · {Math.round(b.pct)}%
                    </span>
                  </div>
                  <div className="bar-track" style={{ background: 'var(--color-border)', marginTop: 5 }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${b.pct}%`,
                        background:
                          b.pct >= 90 ? 'var(--color-accent)' : b.pct >= 70 ? 'var(--color-warning)' : 'var(--color-danger)',
                      }}
                    />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--color-tertiary-text)', marginTop: 3 }}>
                    {b.provision}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Trend + status breakdown ─────────────────────────────── */}
      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <TrendingUp size={15} strokeWidth={1.5} />
              Monthly complaint trend
            </span>
            <span className="meta-pill">last 12 months</span>
          </div>
          <div className="ep-card-body">
            <TrendChart data={trend} height={252} />
            <p className="text-12 text-muted" style={{ marginTop: 'var(--space-3)', lineHeight: 1.6, maxWidth: '76ch' }}>
              A rising filing rate is not in itself a bad sign — under-reporting is the harder
              problem, and awareness programmes are expected to raise it. The line that matters is
              the gap between concluded and concluded within ninety days.
            </p>
          </div>
        </section>

        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <PieIcon size={15} strokeWidth={1.5} />
              Status breakdown
            </span>
            <Link to="/statutory-workspace" className="text-13" style={{ color: 'var(--color-accent)' }}>
              Workspace
            </Link>
          </div>
          <div className="ep-card-body">
            <StatusDonut data={breakdown} height={200} />
            <div style={{ marginTop: 'var(--space-4)' }}>
              <SliceLegend data={breakdown} />
            </div>
          </div>
        </section>
      </div>

      {/* ── Queues ───────────────────────────────────────────────── */}
      {adminQueue.length > 0 && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Inbox size={15} strokeWidth={1.5} />
              Waiting on you
            </span>
            <span className="badge badge-completed">{totalQueue}</span>
          </div>
          <div className="ep-card-body">
            <div className="figure-grid">
              {adminQueue.map((q) => (
                <Link key={q.label} to={q.to} className="figure-tile" style={{ textDecoration: 'none' }}>
                  <div>
                    <div className="figure-label">{q.label}</div>
                    <div className="figure-value" style={{ color: 'var(--color-accent)' }}>
                      {q.n}
                    </div>
                  </div>
                  <ArrowRight size={16} strokeWidth={1.5} style={{ color: 'var(--color-secondary-text)' }} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Three columns of live detail ─────────────────────────── */}
      <div className="ep-grid">
        <div className="flex flex-col gap-5">
          {/* Recent complaints */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Inbox size={15} strokeWidth={1.5} />
                Recent complaints
              </span>
              <Link to="/cases" className="text-13" style={{ color: 'var(--color-accent)' }}>
                All {allCases.length}
              </Link>
            </div>
            <div className="ep-card-body tight">
              {recentComplaints.map(({ record, flow }) => (
                <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Link to={`/cases/${record.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                        {record.id}
                      </Link>
                      <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                      {record.isBreached ? <span className="badge badge-overdue">Past 90d</span> : null}
                    </div>
                    <div className="ep-doc-meta">
                      {record.department} · {record.location} · filed {formatDate(record.filedDate)}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      record.priority === 'High' ? 'badge-high' : record.priority === 'Medium' ? 'badge-medium' : 'badge-low'
                    }`}
                  >
                    {record.priority}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Pending tasks */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ListChecks size={15} strokeWidth={1.5} />
                Pending tasks
              </span>
              <span className={`badge ${overdueTasks.length ? 'badge-overdue' : 'badge-low'}`}>
                {overdueTasks.length} overdue
              </span>
            </div>
            <div className="ep-card-body tight">
              {pendingTasks.slice(0, 7).map((a) => (
                <div key={a.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">{a.title}</div>
                    <div className="ep-doc-meta">
                      <span className="mono">{a.caseId}</span> · {actorName(a.ownerId)} · due {formatDate(a.dueOn)}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      a.status === 'Overdue' ? 'badge-overdue' : a.status === 'In progress' ? 'badge-progress' : 'badge-open'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
              {pendingTasks.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  No task outstanding.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          {/* Upcoming hearings */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <CalendarDays size={15} strokeWidth={1.5} />
                Upcoming hearings
              </span>
              <Link to="/hearings-calendar" className="text-13" style={{ color: 'var(--color-accent)' }}>
                Calendar
              </Link>
            </div>
            <div className="ep-card-body tight">
              {upcoming.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  No sitting listed.
                </p>
              ) : (
                upcoming.slice(0, 5).map((h) => {
                  const d = new Date(h.at)
                  return (
                    <div key={h.id} className="ep-hearing">
                      <div className="ep-hearing-date">
                        <div className="ep-hearing-day">{d.getDate()}</div>
                        <div className="ep-hearing-month">{d.toLocaleString('en-IN', { month: 'short' })}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ep-hearing-title">{h.title}</div>
                        <div className="ep-hearing-meta">
                          {formatTimestamp(h.at)} · {h.where}
                        </div>
                        <div className="ep-hearing-meta mono">{h.caseId}</div>
                      </div>
                      <span className="badge badge-scheduled">Listed</span>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Recent activity */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Activity size={15} strokeWidth={1.5} />
                Recent activity
              </span>
              <Link to="/audit" className="text-13" style={{ color: 'var(--color-accent)' }}>
                Audit log
              </Link>
            </div>
            <div className="ep-card-body tight">
              {recentActivity.map((e) => (
                <div key={e.id} className="ep-doc" style={{ gridTemplateColumns: '28px 1fr auto' }}>
                  <span className="avatar sm">{actorInitials(e.actorId)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">
                      {actorName(e.actorId)} — {e.action.toLowerCase().replace('_', ' ')}
                    </div>
                    <div className="ep-doc-meta">{e.detail}</div>
                  </div>
                  <span className="ep-doc-meta mono" style={{ whiteSpace: 'nowrap' }}>
                    {formatTimestamp(e.at)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Committee + roster shortcut */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ShieldCheck size={15} strokeWidth={1.5} />
                Establishment
              </span>
            </div>
            <div className="ep-card-body">
              <div className="ep-field-list">
                <div>
                  <div className="ep-field-label">Committee boards</div>
                  <div className="ep-field-value">
                    {committees.length} · {boardsValid ? 'all valid under s.4' : 'one short of s.4'}
                  </div>
                </div>
                <div>
                  <div className="ep-field-label">POSH Admins</div>
                  <div className="ep-field-value">{admins.length} provisioned</div>
                </div>
                <div>
                  <div className="ep-field-label">Sittings listed</div>
                  <div className="ep-field-value">{scheduledHearings}</div>
                </div>
                <div>
                  <div className="ep-field-label">Unread notices</div>
                  <div className="ep-field-value">{unreadCount}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <Link to="/employees" className="btn btn-secondary">
                  Employee roster
                </Link>
                <Link to="/committee" className="btn btn-secondary">
                  Internal Committee
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
