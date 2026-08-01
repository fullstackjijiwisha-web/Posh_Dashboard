import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Gavel, ScrollText, ShieldCheck, Timer, Users } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { ClockDial, FigureTile, QuorumRing, QuorumList, SparkBars, DeadlineStrip } from '../components/workflow/Dials'
import { constitutionTests, sittingQuorumTests, allMet } from '../lib/workflow/quorum'
import { hearingsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The Presiding Officer's bench.
 *
 * This role chairs the inquiry, and the two things it is personally answerable for are
 * the clock and the quorum: an inquiry that runs past ninety days is reportable, and a
 * sitting held without a valid bench can have its findings set aside however sound they
 * were. So those two are the whole top of this screen, as instruments rather than
 * numbers in a table.
 */
export function PresidingDashboardPage() {
  const { myAssignedCases, flowFor, committeeById, unreadCount } = useWorkflow()
  const { currentUser } = useRole()

  const today = dateNDaysAgo(0)

  const rows = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)

  const active = rows.filter((r) => !isWorkflowTerminal(r.flow.stage))

  // The case closest to its statutory limit is the one the chair is judged on.
  const mostUrgent = [...active].sort((a, b) => a.record.daysRemaining - b.record.daysRemaining)[0]
  const breached = active.filter((r) => r.record.isBreached)
  const nearLimit = active.filter((r) => !r.record.isBreached && r.record.daysRemaining <= 14)

  // Cause list — sittings ahead, with the bench tested for each.
  const causeList = active
    .flatMap(({ record }) =>
      hearingsFor(record.id)
        .filter((h) => h.status === 'Scheduled' && h.at.slice(0, 10) >= today)
        .map((h) => ({
          id: h.id,
          caseId: record.id,
          at: h.at,
          title: h.title,
          where: h.location,
          attendees: h.attendeeIds,
          tests: sittingQuorumTests(h.attendeeIds),
          urgent: record.daysRemaining <= 14 || record.isBreached,
        })),
    )
    .sort((a, b) => a.at.localeCompare(b.at))

  const nextSitting = causeList[0]
  const defective = causeList.filter((s) => !allMet(s.tests))

  // Board composition, tested once — the chair constitutes the bench.
  const boards = [...new Set(active.map((r) => r.flow.committeeId).filter(Boolean))] as string[]
  const boardHealth = boards
    .map((id) => committeeById(id))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => ({ board: b, tests: constitutionTests(b.memberIds) }))

  // Reports owed to the employer within ten days of the inquiry concluding — s.13(1).
  const reportsOwed = rows.filter((r) =>
    ['minutes_recorded', 'recommendation_submitted', 'recommendation_returned'].includes(r.flow.stage),
  )

  // Load across the last six weeks, purely as a shape beside the figure.
  const loadShape = [4, 6, 5, 8, 7, active.length]

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="ep-hero sweep-line">
        <div style={{ minWidth: 0 }}>
          <div className="ep-hero-greeting">
            {currentUser?.name}
            <span
              className="badge"
              style={{ marginLeft: 12, background: 'rgba(16,185,129,0.14)', color: '#6ee7b7', verticalAlign: 'middle' }}
            >
              Presiding Officer
            </span>
          </div>
          <p className="ep-hero-sub">
            You chair {active.length} live {active.length === 1 ? 'inquiry' : 'inquiries'}. The bench cannot
            sit without you, and the ninety-day clock under s.11(4) runs whether it sits or not.
          </p>
        </div>
        <div className="ep-hero-actions">
          <Link to="/cause-list" className="btn btn-primary">
            Cause list
            <ArrowRight {...ICON} />
          </Link>
          <Link to="/assigned-cases" className="btn btn-secondary">
            <Gavel {...ICON} />
            My inquiries
          </Link>
        </div>
      </div>

      {/* ── The two instruments ──────────────────────────────────── */}
      <div className="ep-grid">
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Timer size={15} strokeWidth={1.5} />
              Closest to the statutory limit
            </span>
            {mostUrgent ? (
              <Link to={`/cases/${mostUrgent.record.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                {mostUrgent.record.id}
              </Link>
            ) : null}
          </div>
          <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
            {mostUrgent ? (
              <>
                <ClockDial
                  elapsed={mostUrgent.record.daysElapsed}
                  breached={mostUrgent.record.isBreached}
                  size={148}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ep-field-label">Stage</div>
                  <div className="ep-field-value">{STAGE_META[mostUrgent.flow.stage].label}</div>
                  <p className="text-12 text-muted" style={{ marginTop: 10, lineHeight: 1.6, maxWidth: '52ch' }}>
                    {mostUrgent.record.isBreached
                      ? 'This inquiry has run past ninety days. A written reason must be on the file and it is reportable in the annual return under Rule 8(5).'
                      : `Filed ${formatDate(mostUrgent.record.filedDate)}. The inquiry must conclude by ${formatDate(mostUrgent.record.milestones.inquiryDue)}.`}
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <DeadlineStrip
                      position={Math.min(1, mostUrgent.record.daysElapsed / 90)}
                      marks={[
                        {
                          label: 'Notice — 7 working days',
                          at: 7 / 90,
                          state: mostUrgent.record.milestones.noticeServedOn ? 'complete' : 'overdue',
                        },
                        {
                          label: 'Reply — 10 working days',
                          at: 21 / 90,
                          state: mostUrgent.record.milestones.replyReceivedOn ? 'complete' : 'due',
                        },
                        {
                          label: 'Inquiry — 90 days',
                          at: 1,
                          state: mostUrgent.record.isBreached ? 'overdue' : 'upcoming',
                        },
                      ]}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-13 text-muted">No live inquiry.</p>
            )}
          </div>
        </section>

        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <ShieldCheck size={15} strokeWidth={1.5} />
              Next sitting — bench check
            </span>
            {nextSitting ? <span className="meta-pill">{formatDate(nextSitting.at)}</span> : null}
          </div>
          <div className="ep-card-body">
            {nextSitting ? (
              <>
                <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <QuorumRing tests={nextSitting.tests} size={148} />
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <QuorumList tests={nextSitting.tests} />
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                  <div className="ep-field-label">{nextSitting.title}</div>
                  <div className="text-12 text-muted" style={{ marginTop: 4 }}>
                    {formatTimestamp(nextSitting.at)} · {nextSitting.where}
                  </div>
                  <div className="text-12 text-muted">
                    {nextSitting.attendees.map(actorName).join(', ')}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-13 text-muted">No sitting listed.</p>
            )}
          </div>
        </section>
      </div>

      {/* ── Figures ──────────────────────────────────────────────── */}
      <div className="figure-grid">
        <FigureTile
          label="Inquiries chaired"
          value={active.length}
          meta={`${rows.length} in total, including concluded`}
          aside={<SparkBars values={loadShape} />}
          to="/assigned-cases"
          cta="Open my inquiries"
        />
        <FigureTile
          label="Past 90 days"
          value={breached.length}
          tone={breached.length ? 'danger' : undefined}
          meta={breached.length ? 'A recorded reason is required on each' : 'Every inquiry within the window'}
          to="/cause-list?filter=breached"
          cta="Show these sittings"
        />
        <FigureTile
          label="Within 14 days of limit"
          value={nearLimit.length}
          tone={nearLimit.length ? 'warning' : undefined}
          meta="Listing priority for the bench"
          to="/cause-list?filter=near-limit"
          cta="Show these sittings"
        />
        <FigureTile
          label="Reports owed to employer"
          value={reportsOwed.length}
          meta="s.13(1) — within 10 days of the inquiry concluding"
          to="/ic-recommendations"
          cta="Open the recommendation centre"
        />
      </div>

      {/* ── Defective benches, if any ────────────────────────────── */}
      {defective.length > 0 && (
        <section className="ep-card" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
          <div className="ep-card-head">
            <span className="ep-card-title">
              <AlertTriangle size={15} strokeWidth={1.5} style={{ color: 'var(--color-warning)' }} />
              Sittings that cannot safely proceed
            </span>
            <span className="badge badge-medium">{defective.length}</span>
          </div>
          <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {defective.map((s) => (
              <div key={s.id} className="wf-blocked">
                <span>
                  <Link to={`/cases/${s.caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                    {s.caseId}
                  </Link>{' '}
                  — {s.title}, {formatDate(s.at)}.{' '}
                  {s.tests
                    .filter((t) => !t.met)
                    .map((t) => t.detail)
                    .join(' ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Board constitution ───────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Users size={15} strokeWidth={1.5} />
            Constitution of your benches
          </span>
          <span className="meta-pill">s.4(1)–(2)</span>
        </div>
        <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {boardHealth.length === 0 ? (
            <p className="text-13 text-muted">No board constituted on your live inquiries.</p>
          ) : (
            boardHealth.map(({ board, tests }) => (
              <div
                key={board.id}
                style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}
              >
                <QuorumRing tests={tests} size={116} />
                <div style={{ minWidth: 240, flex: 1 }}>
                  <div className="ep-field-label">{board.name}</div>
                  <div className="text-12 text-muted" style={{ margin: '4px 0 12px' }}>
                    {board.memberIds.map(actorName).join(', ')} · constituted {formatDate(board.createdAt)}
                  </div>
                  <QuorumList tests={tests} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Cause list preview ───────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <ScrollText size={15} strokeWidth={1.5} />
            Cause list
          </span>
          <Link to="/cause-list" className="text-13" style={{ color: 'var(--color-accent)' }}>
            Full list ({causeList.length})
          </Link>
        </div>
        <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {causeList.length === 0 ? (
            <p className="text-13 text-muted">Nothing listed before you.</p>
          ) : (
            causeList.slice(0, 5).map((s) => {
              const d = new Date(s.at)
              const ok = allMet(s.tests)
              return (
                <div key={s.id} className={`bench-row${s.urgent ? ' urgent' : ''}`}>
                  <div className="bench-time">
                    <div className="bench-hour">{s.at.slice(11, 16)}</div>
                    <div className="bench-date">{d.toLocaleString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-hearing-title">{s.title}</div>
                    <div className="ep-hearing-meta">
                      <Link to={`/cases/${s.caseId}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                        {s.caseId}
                      </Link>{' '}
                      · {s.where}
                    </div>
                  </div>
                  <span className={`badge ${ok ? 'badge-completed' : 'badge-medium'}`}>
                    {ok ? 'Bench valid' : 'Bench short'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </section>

      <p className="ep-confidential">
        <ShieldCheck size={12} strokeWidth={2} />
        You hold {unreadCount} unread notice{unreadCount === 1 ? '' : 's'}. Directions you issue under
        s.11(3) carry the force of a civil court summons and are recorded against the case.
      </p>
    </div>
  )
}
