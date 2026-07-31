import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EyeOff, Inbox, Mail, Plus, Send } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { FigureTile } from '../components/workflow/Dials'
import { communicationsFor } from '../lib/data/caseDetail'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

type Tab = 'Register' | 'Notices'

/**
 * Intake desk.
 *
 * Everything that happens to a complaint before the committee takes carriage of it, and
 * nothing that happens after. The funnel at the top is the honest shape of intake — how
 * many complaints came in, how many were screened, how many became dockets — which is
 * the number HR is actually asked for.
 */
export function IntakeDeskPage() {
  const { allCases, flowFor } = useWorkflow()
  const { maskParty, can } = useRole()
  const [tab, setTab] = useState<Tab>('Register')

  const today = dateNDaysAgo(0)
  const seesInquiry = can('view:inquiry')

  const rows = allCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof allCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)

  const submitted = rows.filter((r) => r.flow.history.some((h) => h.stage === 'complaint_submitted')).length
  const screened = rows.filter((r) => r.flow.history.some((h) => h.stage === 'complaint_under_review')).length
  const accepted = rows.filter((r) => r.flow.history.some((h) => h.stage === 'complaint_accepted')).length
  const docketed = rows.filter((r) => r.flow.history.some((h) => h.stage === 'case_created')).length
  const rejected = rows.filter((r) => r.flow.stage === 'complaint_rejected').length

  const funnel = [
    { label: 'Complaints received', n: submitted || rows.length },
    { label: 'Taken up for screening', n: screened },
    { label: 'Admitted for inquiry', n: accepted },
    { label: 'Docket opened', n: docketed },
  ]
  const top = Math.max(1, ...funnel.map((f) => f.n))

  const atIntake = rows.filter((r) =>
    ['complaint_submitted', 'complaint_under_review', 'complaint_accepted', 'case_created'].includes(r.flow.stage),
  )

  // Notices — the Rule 7 correspondence HR is responsible for serving.
  const notices = rows
    .flatMap(({ record }) => communicationsFor(record.id).map((c) => ({ ...c, caseId: record.id })))
    .filter((c) => c.direction === 'Outbound')
    .sort((a, b) => b.at.localeCompare(a.at))

  const pendingNotices = notices.filter((n) => !n.acknowledged)
  const noticesOverdue = rows.filter(
    (r) => !r.record.milestones.noticeServedOn && r.record.milestones.noticeDue < today,
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Intake desk</h1>
          <p>
            Registration, acknowledgement and service of notice. Everything before the committee
            takes carriage — and nothing after it.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="ep-segment">
            {(['Register', 'Notices'] as Tab[]).map((t) => (
              <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t} ({t === 'Register' ? atIntake.length : pendingNotices.length})
              </button>
            ))}
          </div>
          <Link to="/complaint/new" className="btn btn-primary">
            <Plus {...ICON} />
            Register a complaint
          </Link>
        </div>
      </div>

      <div className="figure-grid">
        <FigureTile label="At intake now" value={atIntake.length} tone={atIntake.length ? 'accent' : undefined} meta="Awaiting screening or a docket" />
        <FigureTile
          label="Notice overdue"
          value={noticesOverdue.length}
          tone={noticesOverdue.length ? 'danger' : undefined}
          meta="Rule 7(1) — 7 working days from the complaint"
        />
        <FigureTile label="Awaiting acknowledgement" value={pendingNotices.length} tone={pendingNotices.length ? 'warning' : undefined} meta="Served but not yet acknowledged" />
        <FigureTile label="Not admitted" value={rejected} meta="Screened out with a recorded reason" />
      </div>

      {/* ── Intake funnel ────────────────────────────────────────── */}
      <section className="ep-card">
        <div className="ep-card-head">
          <span className="ep-card-title">
            <Inbox size={15} strokeWidth={1.5} />
            Intake funnel
          </span>
          <span className="meta-pill">this reporting year</span>
        </div>
        <div className="ep-card-body">
          <div className="funnel">
            {funnel.map((f) => (
              <div key={f.label} className="funnel-step">
                <div className="funnel-bar">
                  <div className="funnel-fill" style={{ width: `${(f.n / top) * 100}%` }} />
                  <span className="funnel-text">{f.label}</span>
                </div>
                <span className="funnel-count">{f.n}</span>
              </div>
            ))}
          </div>
          <p className="text-12 text-muted" style={{ marginTop: 'var(--space-4)', lineHeight: 1.6, maxWidth: '78ch' }}>
            The gap between complaints received and dockets opened is the number a District Officer
            will ask about. Every complaint not admitted carries a written reason on its file.
          </p>
        </div>
      </section>

      {/* ── Register ─────────────────────────────────────────────── */}
      {tab === 'Register' && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">Complaints at intake</span>
            <span className="meta-pill">{atIntake.length}</span>
          </div>
          <div className="table-wrap" style={{ maxHeight: 'none' }}>
            <table className="data" style={{ minWidth: 900 }}>
              <colgroup>
                <col style={{ width: 140 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Stage</th>
                  <th>Complainant</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th className="num">Filed</th>
                  <th className="num">Notice due</th>
                </tr>
              </thead>
              <tbody>
                {atIntake.map(({ record, flow }) => {
                  const late = !record.milestones.noticeServedOn && record.milestones.noticeDue < today
                  return (
                    <tr key={record.id}>
                      <td className="mono" style={{ color: 'var(--color-accent)' }}>
                        {record.id}
                      </td>
                      <td>
                        <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                      </td>
                      <td>{maskParty(record.complainant)}</td>
                      <td className="text-muted">{record.department}</td>
                      <td className="text-muted truncate-cell">{record.location}</td>
                      <td className="num">{formatDate(record.filedDate)}</td>
                      <td className="num" style={late ? { color: 'var(--color-danger)', fontWeight: 500 } : undefined}>
                        {formatDate(record.milestones.noticeDue)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {atIntake.length === 0 ? (
            <div className="ep-card-body">
              <p className="text-13 text-muted">Nothing at intake.</p>
            </div>
          ) : null}
        </section>
      )}

      {/* ── Notices ──────────────────────────────────────────────── */}
      {tab === 'Notices' && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Send size={15} strokeWidth={1.5} />
              Notices served
            </span>
            <span className="meta-pill">{notices.length} on record</span>
          </div>
          <div className="ep-card-body tight">
            {notices.slice(0, 24).map((n) => {
              const toComplainant = n.counterpartyId.includes('complainant')
              return (
                <div key={n.id} className="ep-doc" style={{ gridTemplateColumns: '34px 1fr auto' }}>
                  <span className="ep-doc-icon">
                    <Mail size={14} strokeWidth={1.5} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name">{n.subject}</div>
                    <div className="ep-doc-meta">{n.template}</div>
                    <div className="ep-doc-meta">
                      <span className="mono">{n.caseId}</span> · {n.channel} · to{' '}
                      {toComplainant ? 'Complainant' : 'Respondent'} · {formatTimestamp(n.at)}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      n.deliveryStatus === 'Acknowledged'
                        ? 'badge-completed'
                        : n.deliveryStatus === 'Pending'
                          ? 'badge-medium'
                          : n.deliveryStatus === 'Failed'
                            ? 'badge-overdue'
                            : 'badge-open'
                    }`}
                  >
                    {n.deliveryStatus}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!seesInquiry && (
        <div className="ep-sealed">
          <EyeOff size={13} strokeWidth={1.5} />
          Depositions, evidence and the committee’s findings sit behind this desk and are not loaded
          into it. Intake and correspondence are yours; the inquiry is the committee’s.
        </div>
      )}
    </div>
  )
}
