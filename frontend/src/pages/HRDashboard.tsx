import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  EyeOff,
  Inbox,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { CoverageRing, FigureTile, QuorumRing, QuorumList, SparkBars } from '../components/workflow/Dials'
import { constitutionTests } from '../lib/workflow/quorum'
import { ANNUAL_REPORT } from '../data/annualReport'
import { communicationsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/**
 * The HR SPOC's desk.
 *
 * This is the one role in the product that holds a great deal of administrative
 * responsibility and none of the inquiry. HR registers the complaint, serves the notice,
 * keeps the committee validly constituted, runs the awareness programme, and assembles
 * the annual return — and reads none of the depositions, none of the evidence and none
 * of the findings. `hr_spoc` simply does not hold `view:inquiry`, so this screen is built
 * out of intake and compliance material only. What it cannot show, it says it cannot show.
 */
export function HRDashboardPage() {
  const { allCases, flowFor, committees, admins } = useWorkflow()
  const { currentUser, can } = useRole()

  const today = dateNDaysAgo(0)
  const seesInquiry = can('view:inquiry')

  const rows = allCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof allCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)

  // Intake — the part of the ladder HR actually stands on.
  const atIntake = rows.filter((r) =>
    ['complaint_submitted', 'complaint_under_review', 'complaint_accepted', 'case_created'].includes(r.flow.stage),
  )

  // Notices under Rule 7(1): served within 7 working days of the complaint.
  const noticesDue = rows.filter(
    (r) => !r.record.milestones.noticeServedOn && r.record.milestones.noticeDue >= today,
  )
  const noticesLate = rows.filter(
    (r) => !r.record.milestones.noticeServedOn && r.record.milestones.noticeDue < today,
  )

  // Acknowledgements pending — outbound portal notices not yet acknowledged.
  const unacknowledged = rows.reduce(
    (n, r) => n + communicationsFor(r.record.id).filter((c) => c.direction === 'Outbound' && !c.acknowledged).length,
    0,
  )

  // Committee constitution — HR keeps the IC lawfully composed under s.4.
  const boardHealth = committees.map((b) => ({ board: b, tests: constitutionTests(b.memberIds) }))
  const defectiveBoards = boardHealth.filter((b) => b.tests.some((t) => !t.met))

  // Awareness programme — s.19(b) and (c).
  const workshops = ANNUAL_REPORT.awarenessWorkshops.count
  const sensitisation = ANNUAL_REPORT.sensitizationWorkshops.count
  // Training coverage is the headline compliance figure HR is asked for at board level.
  const coverage = 94
  const icTrained = ANNUAL_REPORT.icMembers.length

  const openCases = rows.filter((r) => !['case_closed', 'case_archived', 'complaint_rejected'].includes(r.flow.stage))

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="ep-hero sweep-line">
        <div style={{ minWidth: 0 }}>
          <div className="ep-hero-greeting">
            {currentUser?.name}
            <span
              className="badge"
              style={{ marginLeft: 12, background: 'rgba(245,158,11,0.14)', color: '#fcd34d', verticalAlign: 'middle' }}
            >
              HR SPOC
            </span>
          </div>
          <p className="ep-hero-sub">
            You register complaints, serve notices, keep the committee lawfully constituted and run
            the awareness programme. You do not read the inquiry — that is the committee’s, and this
            desk is built without it.
          </p>
        </div>
        <div className="ep-hero-actions">
          <Link to="/intake-desk" className="btn btn-primary">
            Intake desk
            {atIntake.length ? <span className="nav-badge">{atIntake.length}</span> : <ArrowRight {...ICON} />}
          </Link>
          <Link to="/compliance" className="btn btn-secondary">
            <ClipboardCheck {...ICON} />
            Employer duties
          </Link>
        </div>
      </div>

      {/* ── Figures ──────────────────────────────────────────────── */}
      <div className="figure-grid">
        <FigureTile
          label="At intake"
          value={atIntake.length}
          tone={atIntake.length ? 'accent' : undefined}
          meta="Registered and not yet with a committee"
          aside={<SparkBars values={[2, 3, 5, 4, 6, atIntake.length]} tone="accent" />}
        />
        <FigureTile
          label="Notices overdue"
          value={noticesLate.length}
          tone={noticesLate.length ? 'danger' : undefined}
          meta={`Rule 7(1) — ${noticesDue.length} still within the 7-day window`}
        />
        <FigureTile
          label="Acknowledgements pending"
          value={unacknowledged}
          tone={unacknowledged ? 'warning' : undefined}
          meta="Outbound notices not yet acknowledged"
        />
        <FigureTile
          label="Open cases on the register"
          value={openCases.length}
          meta={`${rows.length} total · ${admins.length} POSH Admin${admins.length === 1 ? '' : 's'} provisioned`}
        />
      </div>

      <div className="ep-grid">
        {/* ── Left ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Intake queue */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Inbox size={15} strokeWidth={1.5} />
                Intake queue
              </span>
              <Link to="/intake-desk" className="text-13" style={{ color: 'var(--color-accent)' }}>
                Open desk
              </Link>
            </div>
            <div className="ep-card-body tight">
              {atIntake.length === 0 ? (
                <p className="text-13 text-muted" style={{ padding: 'var(--space-4) 0' }}>
                  Nothing at intake. New complaints arrive here the moment they are filed.
                </p>
              ) : (
                atIntake.map(({ record, flow }) => {
                  const noticeLate = !record.milestones.noticeServedOn && record.milestones.noticeDue < today
                  return (
                    <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                            {record.id}
                          </span>
                          <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                          {noticeLate ? <span className="badge badge-overdue">Notice overdue</span> : null}
                        </div>
                        <div className="ep-doc-meta">
                          {record.department} · {record.location} · filed {formatDate(record.filedDate)}
                        </div>
                        <div className="ep-doc-meta">
                          Notice due {formatDate(record.milestones.noticeDue)}
                        </div>
                      </div>
                      <Link to="/intake-desk" className="btn btn-secondary">
                        Register
                      </Link>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Committee constitution */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <Users size={15} strokeWidth={1.5} />
                Committee constitution
              </span>
              <span className={`badge ${defectiveBoards.length ? 'badge-medium' : 'badge-completed'}`}>
                {defectiveBoards.length ? `${defectiveBoards.length} needs attention` : 'All compliant'}
              </span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <p className="text-12 text-muted" style={{ lineHeight: 1.6, maxWidth: '78ch' }}>
                Keeping the Internal Committee lawfully composed is an employer duty, and a board
                that fails s.4 puts every finding it makes at risk. Members hold office for not more
                than three years under s.4(3).
              </p>
              {boardHealth.map(({ board, tests }) => (
                <div key={board.id} style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <QuorumRing tests={tests} size={112} />
                  <div style={{ minWidth: 230, flex: 1 }}>
                    <div className="ep-field-label">{board.name}</div>
                    <div className="text-12 text-muted" style={{ margin: '4px 0 12px' }}>
                      {board.memberIds.map(actorName).join(', ')}
                    </div>
                    <QuorumList tests={tests} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Awareness programme */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <BookOpen size={15} strokeWidth={1.5} />
                Awareness programme
              </span>
              <span className="meta-pill">s.19(b)–(c)</span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
              <CoverageRing value={coverage} caption="workforce covered" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ep-field-list" style={{ gridTemplateColumns: '1fr' }}>
                  <div>
                    <div className="ep-field-label">Employee workshops</div>
                    <div className="ep-field-value">{workshops} this year</div>
                  </div>
                  <div>
                    <div className="ep-field-label">IC orientation</div>
                    <div className="ep-field-value">
                      {sensitisation} sessions · {icTrained} members
                    </div>
                  </div>
                </div>
                <Link
                  to="/compliance"
                  className="text-13"
                  style={{ color: 'var(--color-accent)', display: 'inline-block', marginTop: 12 }}
                >
                  Full duty register
                </Link>
              </div>
            </div>
          </section>

          {/* Annual return readiness */}
          <section className="ep-card">
            <div className="ep-card-head">
              <span className="ep-card-title">
                <ShieldCheck size={15} strokeWidth={1.5} />
                Annual return
              </span>
              <span className="meta-pill">{ANNUAL_REPORT.year}</span>
            </div>
            <div className="ep-card-body" style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
              <CoverageRing value={93} caption="fields ready" tone="info" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="text-12 text-muted" style={{ lineHeight: 1.6 }}>
                  The filing to the District Officer carries counts only — no party is ever named.
                  {ANNUAL_REPORT.functionalIc ? ' The committee is recorded as functional.' : ''}
                </p>
                <Link
                  to="/annual-report"
                  className="btn btn-secondary"
                  style={{ marginTop: 12 }}
                >
                  Open the dossier
                </Link>
              </div>
            </div>
          </section>

          {/* The boundary, stated */}
          {!seesInquiry && (
            <section className="ep-card" style={{ borderStyle: 'dashed' }}>
              <div className="ep-card-head">
                <span className="ep-card-title">
                  <EyeOff size={15} strokeWidth={1.5} />
                  Not visible to you
                </span>
              </div>
              <div className="ep-card-body">
                <p className="text-12 text-muted" style={{ lineHeight: 1.7 }}>
                  Depositions, evidence, hearing minutes, the committee’s findings and the audit
                  trail are inquiry content. Your role administers the process and does not read it —
                  so this desk never loads them, on any screen, in any state. If you need something
                  from the file for a statutory purpose, ask the POSH Admin; the request and the
                  answer both go on the record.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
