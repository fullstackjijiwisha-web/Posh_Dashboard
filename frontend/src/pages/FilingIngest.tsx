import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileInput, Search, Users } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { FigureTile } from '../components/workflow/Dials'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { dateNDaysAgo } from '../lib/data/statutory'
import { formatDate, formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

/** The four intake stages, in the order a filing passes through them. */
const INGEST_STAGES = ['complaint_submitted', 'complaint_under_review', 'complaint_accepted', 'case_created'] as const

/**
 * Filing Ingest Centre.
 *
 * Everything between a complaint arriving and a committee taking carriage of it. This is
 * where the administrator's discretion actually bites — a filing screened out here never
 * becomes a case, so the rejection reason is compulsory and goes on the record where the
 * complainant can read it.
 *
 * The board assignment sits on this screen too rather than only on the committee console,
 * because assigning a board is the last act of ingest, not the first act of the inquiry.
 */
export function FilingIngestPage() {
  const { allCases, flowFor, committees, assignCommittee, runAction, committeeById } = useWorkflow()
  const { maskParty } = useRole()
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('All')

  const today = dateNDaysAgo(0)

  const pairs = allCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((p): p is { record: (typeof allCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!p.flow)

  const inIngest = pairs.filter((p) => (INGEST_STAGES as readonly string[]).includes(p.flow.stage))

  const q = query.trim().toLowerCase()
  const rows = inIngest
    .filter((p) => stageFilter === 'All' || p.flow.stage === stageFilter)
    .filter(
      (p) =>
        !q ||
        [p.record.id, p.record.department, p.record.location, p.record.summary].join(' ').toLowerCase().includes(q),
    )
    // Oldest filing first — the one that has been waiting longest is the one at risk.
    .sort((a, b) => a.record.filedDate.localeCompare(b.record.filedDate))

  const counts = Object.fromEntries(
    INGEST_STAGES.map((s) => [s, inIngest.filter((p) => p.flow.stage === s).length]),
  ) as Record<(typeof INGEST_STAGES)[number], number>

  const noticeOverdue = inIngest.filter(
    (p) => !p.record.milestones.noticeServedOn && p.record.milestones.noticeDue < today,
  ).length

  const rejected = pairs.filter((p) => p.flow.stage === 'complaint_rejected')

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Filing ingest centre</h1>
          <p>
            Review incoming filings, admit or decline them, open the statutory docket and assign a
            committee board. Everything before the inquiry begins.
          </p>
        </div>
        <div className="ep-vault-search" style={{ maxWidth: 320 }}>
          <Search size={15} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filings"
            aria-label="Search filings"
          />
        </div>
      </div>

      {/* Five tiles, one per position in ingest plus the notice clock — a tile per
          stage the list can actually contain, so the figures never all read zero while
          filings are sitting on the screen below them. */}
      <div className="figure-grid">
        <FigureTile
          label="Awaiting screening"
          value={counts.complaint_submitted}
          tone={counts.complaint_submitted ? 'accent' : undefined}
          meta="Filed and not yet taken up"
        />
        <FigureTile label="Under review" value={counts.complaint_under_review} meta="Screening in progress" />
        <FigureTile
          label="Docket to open"
          value={counts.complaint_accepted}
          tone={counts.complaint_accepted ? 'warning' : undefined}
          meta="Admitted — open the case file"
        />
        <FigureTile
          label="Board to assign"
          value={counts.case_created}
          tone={counts.case_created ? 'warning' : undefined}
          meta="Docket open, no committee carrying it"
        />
        <FigureTile
          label="Notice overdue"
          value={noticeOverdue}
          tone={noticeOverdue ? 'danger' : undefined}
          meta="Rule 7(1) — 7 working days"
        />
      </div>

      {/* Stage filter */}
      <div className="ep-segment" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={stageFilter === 'All' ? 'active' : ''} onClick={() => setStageFilter('All')}>
          All ({inIngest.length})
        </button>
        {INGEST_STAGES.map((s) => (
          <button key={s} type="button" className={stageFilter === s ? 'active' : ''} onClick={() => setStageFilter(s)}>
            {STAGE_META[s].label} ({counts[s]})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="wf-empty">
          {query ? 'No filing matches that search.' : 'Nothing at ingest. New filings arrive here the moment they are submitted.'}
        </div>
      ) : (
        rows.map(({ record, flow }) => {
          const waiting = Math.max(0, Math.round((Date.parse(today) - Date.parse(record.filedDate)) / 86400000))
          const noticeLate = !record.milestones.noticeServedOn && record.milestones.noticeDue < today
          const needsBoard = flow.stage === 'case_created'

          return (
            <section key={record.id} className="ep-card">
              <div className="ep-card-head">
                <span className="ep-card-title">
                  <FileInput size={15} strokeWidth={1.5} />
                  <Link to={`/cases/${record.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                    {record.id}
                  </Link>
                  <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                  {noticeLate ? <span className="badge badge-overdue">Notice overdue</span> : null}
                </span>
                <span className="meta-pill">
                  {waiting} day{waiting === 1 ? '' : 's'} at ingest
                </span>
              </div>

              <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <p className="text-13" style={{ color: 'var(--color-primary)', lineHeight: 1.7, maxWidth: '86ch' }}>
                  {record.summary}
                </p>

                <div className="ep-field-list">
                  <div>
                    <div className="ep-field-label">Complainant</div>
                    <div className="ep-field-value">{maskParty(record.complainant)}</div>
                  </div>
                  <div>
                    <div className="ep-field-label">Respondent</div>
                    <div className="ep-field-value">{maskParty(record.respondent)}</div>
                  </div>
                  <div>
                    <div className="ep-field-label">Filed / incident</div>
                    <div className="ep-field-value">
                      {formatDate(record.filedDate)} · incident {formatDate(record.incidentDate)}
                    </div>
                  </div>
                  <div>
                    <div className="ep-field-label">Notice due</div>
                    <div
                      className="ep-field-value"
                      style={noticeLate ? { color: 'var(--color-danger)' } : undefined}
                    >
                      {formatDate(record.milestones.noticeDue)}
                    </div>
                  </div>
                  <div>
                    <div className="ep-field-label">Department / location</div>
                    <div className="ep-field-value">
                      {record.department} · {record.location}
                    </div>
                  </div>
                  <div>
                    <div className="ep-field-label">Conciliation (s.10)</div>
                    <div className="ep-field-value">
                      {record.conciliationRequested ? 'Requested' : 'Not requested'}
                    </div>
                  </div>
                  <div>
                    <div className="ep-field-label">Material filed</div>
                    <div className="ep-field-value">
                      {flow.evidence.length} item{flow.evidence.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div>
                    <div className="ep-field-label">Board</div>
                    <div className="ep-field-value">
                      {committeeById(flow.committeeId)?.name ?? 'Not yet assigned'}
                    </div>
                  </div>
                </div>

                {/* Material attached to the filing. */}
                {flow.evidence.length > 0 && (
                  <div>
                    <div className="cw-section-label" style={{ marginBottom: 10 }}>
                      Attached at filing
                    </div>
                    {flow.evidence.map((e) => (
                      <div key={e.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="ep-doc-name">{e.label}</div>
                          <div className="ep-doc-meta">
                            {e.note} · {formatTimestamp(e.uploadedAt)}
                          </div>
                        </div>
                        <span className="badge badge-medium">{e.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Board assignment, the last act of ingest. */}
                {needsBoard && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      padding: 'var(--space-4)',
                      border: '1px solid var(--color-border-strong)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-raised)',
                    }}
                  >
                    <Users {...ICON} style={{ color: 'var(--color-violet)' }} />
                    <span className="text-13">Assign an Internal Committee board</span>
                    <select
                      className="select"
                      value={flow.committeeId ?? ''}
                      onChange={(e) => assignCommittee(record.id, e.target.value)}
                      style={{ minWidth: 240 }}
                    >
                      <option value="">Choose a board…</option>
                      {committees.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!flow.committeeId}
                      onClick={() => runAction(record.id, 'assign-committee')}
                    >
                      Assign
                    </button>
                  </div>
                )}

                <div>
                  <div className="cw-section-label" style={{ marginBottom: 12 }}>
                    Your decision
                  </div>
                  <ActionPanel caseId={record.id} />
                </div>
              </div>
            </section>
          )
        })
      )}

      {/* Declined filings stay on the record. */}
      {rejected.length > 0 && (
        <section className="ep-card">
          <div className="ep-card-head">
            <span className="ep-card-title">Not admitted</span>
            <span className="meta-pill">{rejected.length}</span>
          </div>
          <div className="ep-card-body tight">
            {rejected.map(({ record, flow }) => {
              const last = flow.history[flow.history.length - 1]
              return (
                <div key={record.id} className="ep-doc" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-doc-name mono">{record.id}</div>
                    <div className="ep-doc-meta">{last?.remarks}</div>
                    <div className="ep-doc-meta">
                      {last?.actorName} · {formatTimestamp(last?.at ?? record.filedDate)}
                    </div>
                  </div>
                  <span className="badge badge-overdue">Declined</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
