import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Fingerprint,
  Gavel,
  ListChecks,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { ClockDial, CoverageRing, FigureTile, SparkBars } from '../components/workflow/Dials'
import { StageTracker } from '../components/workflow/StageTracker'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { hearingsFor, actionsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The Internal Committee member's inquiry desk.
 *
 * An internal member is not the chair and not the outside conscience — they are the
 * people who actually do the inquiry: read the material, sit, examine, and put their
 * name to a finding. So this screen leads with the queue of work that is genuinely
 * theirs, and with their own attendance, which is the one thing a member is personally
 * on the hook for if a sitting later turns out to have been short.
 */
export function ICMemberDashboardPage() {
  const { myAssignedCases, flowFor, myNotifications, unreadCount } = useWorkflow()
  const { currentUser } = useRole()

  const today = dateNDaysAgo(0)
  const uid = currentUser?.id ?? ''

  const rows = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)

  const active = rows.filter((r) => !isWorkflowTerminal(r.flow.stage))

  // Cases where this member can actually do something right now, in ladder order —
  // the work queue, not the caseload.
  const actionable = active.filter((r) =>
    [
      'committee_assigned',
      'committee_accepted',
      'investigation_started',
      'evidence_review',
      'evidence_resubmitted',
      'evidence_verified',
      'hearing_scheduled',
      'hearing_completed',
      'minutes_recorded',
      'recommendation_returned',
    ].includes(r.flow.stage),
  )

  const evidenceToRead = active.reduce(
    (n, r) => n + r.flow.evidence.filter((e) => e.status === 'Pending verification').length,
    0,
  )

  const mySittings = active.flatMap(({ record }) =>
    hearingsFor(record.id).map((h) => ({
      id: h.id,
      caseId: record.id,
      at: h.at,
      title: h.title,
      where: h.location,
      status: h.status,
      mine: h.attendeeIds.includes(uid),
      minuted: h.minutesRecorded,
    })),
  )

  const upcoming = mySittings
    .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
    .sort((a, b) => a.at.localeCompare(b.at))

  // Attendance: of the sittings already held on their cases, how many did they sit on.
  const held = mySittings.filter((h) => h.status === 'Completed')
  const attended = held.filter((h) => h.mine).length
  const attendance = held.length ? (attended / held.length) * 100 : 100

  const myTasks = active
    .flatMap(({ record }) => actionsFor(record.id).map((a) => ({ ...a, caseId: record.id })))
    .filter((a) => a.ownerId === uid && a.status !== 'Done')
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))

  const overdueTasks = myTasks.filter((a) => a.status === 'Overdue').length

  const recsPending = active.filter((r) =>
    ['minutes_recorded', 'recommendation_returned'].includes(r.flow.stage),
  ).length

  const focus = [...actionable].sort((a, b) => a.record.daysRemaining - b.record.daysRemaining)[0]

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="ep-hero sweep-line">
        <div style={{ minWidth: 0 }}>
          <div className="ep-hero-greeting">
            {currentUser?.name}
            <span
              className="badge"
              style={{ marginLeft: 12, background: 'rgba(59,130,246,0.14)', color: '#93c5fd', verticalAlign: 'middle' }}
            >
              Internal Committee member
            </span>
          </div>
          <p className="ep-hero-sub">
            {actionable.length
              ? `${actionable.length} of your ${active.length} inquiries are waiting on the committee. `
              : `You are sitting on ${active.length} inquiries, none currently waiting on you. `}
            You put your name to the findings, so what you read and where you sit is on the record.
          </p>
        </div>
        <div className="ep-hero-actions">
          <Link to="/my-tasks" className="btn btn-primary">
            My tasks
            {myTasks.length ? <span className="nav-badge">{myTasks.length}</span> : <ArrowRight {...ICON} />}
          </Link>
          <Link to="/assigned-cases" className="btn btn-secondary">
            <Gavel {...ICON} />
            Assigned cases
          </Link>
        </div>
      </div>

      {/* ── Figures ──────────────────────────────────────────────── */}
      <div className="figure-grid">
        <FigureTile
          label="Waiting on you"
          value={actionable.length}
          tone={actionable.length ? 'accent' : undefined}
          meta={`${active.length} inquiries in total`}
          aside={<SparkBars values={[3, 5, 4, 6, 5, actionable.length]} tone="info" />}
        />
        <FigureTile
          label="Evidence to read"
          value={evidenceToRead}
          tone={evidenceToRead ? 'warning' : undefined}
          meta="Items filed and not yet admitted"
        />
        <FigureTile
          label="Sittings ahead"
          value={upcoming.length}
          meta={upcoming.length ? `Next ${formatDate(upcoming[0].at)}` : 'Nothing listed'}
        />
        <FigureTile
          label="Tasks assigned to you"
          value={myTasks.length}
          tone={overdueTasks ? 'danger' : undefined}
          meta={overdueTasks ? `${overdueTasks} overdue` : 'None overdue'}
        />
      </div>

      <div className="ep-grid">
        {/* ── Left ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Focus case */}
          {focus && (
            <section className="ep-card">
              <div className="ep-card-head">
                <span className="ep-card-title">
                  <Gavel size={15} strokeWidth={1.5} />
                  Take this next
                </span>
                <Link to={`/cases/${focus.record.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                  {focus.record.id}
                </Link>
              </div>
              <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <ClockDial
                    elapsed={focus.record.daysElapsed}
                    breached={focus.record.isBreached}
                    size={128}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <StageTracker stage={focus.flow.stage} />
                    <p className="text-12 text-muted" style={{ marginTop: 12, lineHeight: 1.6, maxWidth: '56ch' }}>
                      {focus.record.summary}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="cw-section-label" style={{ marginBottom: 12 }}>
                    Your actions
                  </div>
                  <ActionPanel caseId={focus.record.id} />
                </div>
              </div>
            </section>
          )}

          {/* Work queue */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ListChecks size={15} strokeWidth={1.5} />
                Your inquiry queue
              </span>
              <span className="meta-pill">{actionable.length}</span>
            </div>
            <div className="ep-card-body tight">
              {actionable.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing is waiting on the committee. Cases return here as they move.
                </p>
              ) : (
                actionable.map(({ record, flow }) => {
                  const pending = flow.evidence.filter((e) => e.status === 'Pending verification').length
                  return (
                    <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Link to={`/cases/${record.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                            {record.id}
                          </Link>
                          <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                          {record.isBreached ? (
                            <span className="badge badge-overdue">Past 90 days</span>
                          ) : record.daysRemaining <= 14 ? (
                            <span className="badge badge-medium">{record.daysRemaining}d left</span>
                          ) : null}
                        </div>
                        <div className="ep-doc-meta">
                          {STAGE_META[flow.stage].description}
                          {pending ? ` · ${pending} item${pending === 1 ? '' : 's'} to read` : ''}
                        </div>
                      </div>
                      <Link to={`/cases/${record.id}`} className="btn btn-secondary">
                        Open
                      </Link>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Tasks */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <CheckCircle2 size={15} strokeWidth={1.5} />
                Tasks assigned to you
              </span>
              <Link to="/my-tasks" className="text-13" style={{ color: 'var(--color-accent)' }}>
                All {myTasks.length}
              </Link>
            </div>
            <div className="ep-card-body tight">
              {myTasks.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing assigned to you.
                </p>
              ) : (
                myTasks.slice(0, 5).map((a) => (
                  <div key={a.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="ep-doc-name">{a.title}</div>
                      <div className="ep-doc-meta">
                        <span className="mono">{a.caseId}</span> · due {formatDate(a.dueOn)}
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
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── Right ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Attendance */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ShieldCheck size={15} strokeWidth={1.5} />
                Your attendance
              </span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
              <CoverageRing value={attendance} caption="sittings sat" tone={attendance >= 80 ? 'accent' : 'warning'} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ep-field-label">Sat / held</div>
                <div className="ep-field-value">
                  {attended} of {held.length}
                </div>
                <p className="text-12 text-muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  A member who did not sit cannot sign the finding for that sitting. Absences are on
                  the record and count against quorum.
                </p>
              </div>
            </div>
          </section>

          {/* Sittings */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <CalendarDays size={15} strokeWidth={1.5} />
                Your sittings
              </span>
              <Link to="/hearing-calendar" className="text-13" style={{ color: 'var(--color-accent)' }}>
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
                        <div className="ep-hearing-month">
                          {d.toLocaleString('en-IN', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ep-hearing-title">{h.title}</div>
                        <div className="ep-hearing-meta">
                          {formatTimestamp(h.at)} · {h.where}
                        </div>
                        <div className="ep-hearing-meta mono">{h.caseId}</div>
                      </div>
                      {h.mine ? (
                        <span className="badge badge-completed">You sit</span>
                      ) : (
                        <span className="badge badge-low">Not listed</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Evidence + recommendations shortcuts */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">Go to</span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Link to="/evidence-register" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Fingerprint {...ICON} />
                Evidence register
                {evidenceToRead ? <span className="nav-badge">{evidenceToRead}</span> : null}
              </Link>
              <Link to="/ic-recommendations" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Scale {...ICON} />
                Recommendation centre
                {recsPending ? <span className="nav-badge">{recsPending}</span> : null}
              </Link>
              <Link to="/documents-vault" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Gavel {...ICON} />
                Documents vault
              </Link>
            </div>
          </section>

          {/* Notices */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">Notifications</span>
              {unreadCount ? <span className="badge badge-completed">{unreadCount} new</span> : null}
            </div>
            <div className="ep-card-body tight">
              {myNotifications.slice(0, 3).map((n) => (
                <div key={n.id} className="ep-hearing" style={{ gridTemplateColumns: '8px 1fr' }}>
                  <span className={`wf-notice-dot ${n.read ? 'read' : ''}`} style={{ marginTop: 6 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-hearing-title">{n.title}</div>
                    <div className="ep-hearing-meta">{n.detail}</div>
                  </div>
                </div>
              ))}
              {myNotifications.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing new.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
