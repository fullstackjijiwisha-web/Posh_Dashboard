import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, LayoutGrid, Rows3, Search } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, HAPPY_PATH, isWorkflowTerminal, type WorkflowStage } from '../lib/workflow/types'
import { ClockDial, FigureTile } from '../components/workflow/Dials'
import { StageTracker } from '../components/workflow/StageTracker'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { custodian } from '../components/workflow/StageTracker'
import { DEPARTMENTS } from '../lib/data/cases'
import { formatDate } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'
import '../components/workflow/Dials.css'

type View = 'Board' | 'List'

/**
 * Statutory Cases Workspace.
 *
 * Active proceedings, monitored. The board view is a Kanban over the lifecycle ladder,
 * which is the honest shape of the thing — a case does not have a "status", it has a
 * position, and a column that is piling up is a bottleneck rather than a category.
 *
 * Only stages that currently hold a case get a column. An empty ladder rendered in full
 * would be twenty-one columns of nothing, which tells the reader less than five columns
 * of something.
 */
export function StatutoryWorkspacePage() {
  const { allCases, flowFor, committeeById } = useWorkflow()
  const { maskParty } = useRole()

  const [view, setView] = useState<View>('Board')
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('All')
  const [only, setOnly] = useState<'Active' | 'Concluded' | 'All'>('Active')
  const [selected, setSelected] = useState<string | null>(null)

  const pairs = useMemo(
    () =>
      allCases
        .map((record) => ({ record, flow: flowFor(record.id) }))
        .filter((p): p is { record: (typeof allCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!p.flow),
    [allCases, flowFor],
  )

  const q = query.trim().toLowerCase()
  const rows = pairs
    .filter((p) => {
      const done = isWorkflowTerminal(p.flow.stage)
      return only === 'All' ? true : only === 'Active' ? !done : done
    })
    .filter((p) => department === 'All' || p.record.department === department)
    .filter(
      (p) => !q || [p.record.id, p.record.department, p.record.location, p.record.summary].join(' ').toLowerCase().includes(q),
    )

  // Columns in ladder order, skipping the ones nobody is standing on.
  const columns = HAPPY_PATH.filter((stage) => rows.some((r) => r.flow.stage === stage))
  const offPath = [...new Set(rows.map((r) => r.flow.stage))].filter(
    (s) => !(HAPPY_PATH as WorkflowStage[]).includes(s),
  )
  const allColumns = [...columns, ...offPath]

  const active = pairs.filter((p) => !isWorkflowTerminal(p.flow.stage))
  const breached = active.filter((p) => p.record.isBreached)
  const stalled = active.filter((p) => p.record.daysElapsed > 45 && p.record.daysRemaining > 0)

  const detail = selected ? pairs.find((p) => p.record.id === selected) : undefined

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Statutory cases workspace</h1>
          <p>
            Active proceedings by position on the lifecycle. A column that is filling up is where
            the process is stuck, not a category of case.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <div className="ep-segment">
            <button type="button" className={view === 'Board' ? 'active' : ''} onClick={() => setView('Board')}>
              <LayoutGrid size={13} strokeWidth={1.5} style={{ marginRight: 5 }} />
              Board
            </button>
            <button type="button" className={view === 'List' ? 'active' : ''} onClick={() => setView('List')}>
              <Rows3 size={13} strokeWidth={1.5} style={{ marginRight: 5 }} />
              List
            </button>
          </div>
          <div className="ep-segment">
            {(['Active', 'Concluded', 'All'] as const).map((o) => (
              <button key={o} type="button" className={only === o ? 'active' : ''} onClick={() => setOnly(o)}>
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="figure-grid">
        <FigureTile label="Active proceedings" value={active.length} meta={`${pairs.length} on the register`} />
        <FigureTile
          label="Past 90 days"
          value={breached.length}
          tone={breached.length ? 'danger' : undefined}
          meta="Recorded reason required"
        />
        <FigureTile label="Running over 45 days" value={stalled.length} tone={stalled.length ? 'warning' : undefined} meta="Past the halfway mark" />
        <FigureTile label="Stages in play" value={allColumns.length} meta="Distinct positions on the ladder" />
      </div>

      <div className="ep-vault-toolbar">
        <div className="ep-vault-search">
          <Search size={15} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases by number, department or summary"
            aria-label="Search cases"
          />
        </div>
        <select className="select" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="All">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="wf-empty">No case matches those filters.</div>
      ) : view === 'Board' ? (
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)', minWidth: 'min-content' }}>
            {allColumns.map((stage) => {
              const inCol = rows.filter((r) => r.flow.stage === stage)
              return (
                <div key={stage} style={{ width: 268, flexShrink: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 8,
                      padding: '0 2px 10px',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{STAGE_META[stage].label}</span>
                    <span className="meta-pill">{inCol.length}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--color-tertiary-text)',
                      padding: '0 2px 10px',
                    }}
                  >
                    with {custodian(stage)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {inCol.map(({ record, flow }) => {
                      const urgent = record.isBreached || record.daysRemaining <= 7
                      return (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => setSelected(record.id)}
                          style={{
                            textAlign: 'left',
                            width: '100%',
                            padding: 'var(--space-3)',
                            border: '1px solid var(--color-border)',
                            borderLeft: urgent ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            background:
                              selected === record.id ? 'var(--color-accent-tint)' : 'var(--color-surface)',
                            transition: 'background-color var(--ease), border-color var(--ease)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                            <span className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                              {record.id}
                            </span>
                            <span
                              className={`badge ${
                                record.priority === 'High'
                                  ? 'badge-high'
                                  : record.priority === 'Medium'
                                    ? 'badge-medium'
                                    : 'badge-low'
                              }`}
                            >
                              {record.priority}
                            </span>
                          </div>
                          <div className="ep-doc-meta" style={{ marginTop: 6 }}>
                            {record.department} · Day {record.daysElapsed}
                          </div>
                          <div className="ep-doc-meta">
                            {record.isBreached ? (
                              <span style={{ color: 'var(--color-danger)' }}>Past 90 days</span>
                            ) : (
                              `${record.daysRemaining} days left`
                            )}
                            {flow.committeeId ? ` · ${committeeById(flow.committeeId)?.name.split('—')[1]?.trim() ?? 'board'}` : ''}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <section className="ep-card">
          <div className="table-wrap" style={{ maxHeight: 'none' }}>
            <table className="data" style={{ minWidth: 1000 }}>
              <colgroup>
                <col style={{ width: 140 }} />
                <col style={{ width: 170 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Stage</th>
                  <th>Complainant</th>
                  <th>Respondent</th>
                  <th>Department</th>
                  <th className="num">Day</th>
                  <th className="num">Left</th>
                  <th>Board</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ record, flow }) => (
                  <tr key={record.id} onClick={() => setSelected(record.id)} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ color: 'var(--color-accent)' }}>
                      {record.id}
                    </td>
                    <td>
                      <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                    </td>
                    <td className="truncate-cell">{maskParty(record.complainant)}</td>
                    <td className="truncate-cell">{maskParty(record.respondent)}</td>
                    <td className="text-muted truncate-cell">{record.department}</td>
                    <td className="num">{record.daysElapsed}</td>
                    <td className="num" style={record.isBreached ? { color: 'var(--color-danger)' } : undefined}>
                      {record.isBreached ? '—' : record.daysRemaining}
                    </td>
                    <td className="text-muted truncate-cell">
                      {committeeById(flow.committeeId)?.name ?? 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Selected case detail ─────────────────────────────────── */}
      {detail && (
        <section className="ep-card rise">
          <div className="ep-card-head">
            <span className="ep-card-title">
              <Gavel size={15} strokeWidth={1.5} />
              <Link to={`/cases/${detail.record.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                {detail.record.id}
              </Link>
            </span>
            <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
              <ClockDial elapsed={detail.record.daysElapsed} breached={detail.record.isBreached} size={128} />
              <div style={{ minWidth: 260, flex: 1 }}>
                <StageTracker stage={detail.flow.stage} />
                <p className="text-12 text-muted" style={{ marginTop: 12, lineHeight: 1.6, maxWidth: '62ch' }}>
                  {detail.record.summary}
                </p>
              </div>
            </div>

            <div className="ep-field-list">
              <div>
                <div className="ep-field-label">Parties</div>
                <div className="ep-field-value">
                  {maskParty(detail.record.complainant)} v {maskParty(detail.record.respondent)}
                </div>
              </div>
              <div>
                <div className="ep-field-label">Filed</div>
                <div className="ep-field-value">{formatDate(detail.record.filedDate)}</div>
              </div>
              <div>
                <div className="ep-field-label">Board</div>
                <div className="ep-field-value">{committeeById(detail.flow.committeeId)?.name ?? 'Unassigned'}</div>
              </div>
              <div>
                <div className="ep-field-label">Panel</div>
                <div className="ep-field-value">{detail.record.assignedIC.map(actorName).join(', ') || '—'}</div>
              </div>
              <div>
                <div className="ep-field-label">Evidence</div>
                <div className="ep-field-value">{detail.flow.evidence.length} on record</div>
              </div>
              <div>
                <div className="ep-field-label">Sittings</div>
                <div className="ep-field-value">{detail.flow.hearings.length} listed through the workflow</div>
              </div>
              <div>
                <div className="ep-field-label">Recommendation</div>
                <div className="ep-field-value">
                  {detail.flow.recommendations.length
                    ? detail.flow.recommendations[detail.flow.recommendations.length - 1].status
                    : 'Not drafted'}
                </div>
              </div>
              <div>
                <div className="ep-field-label">Outcome</div>
                <div className="ep-field-value">{detail.flow.finalDecision?.outcome ?? 'Not yet decided'}</div>
              </div>
            </div>

            {detail.record.isBreached && detail.record.breachReason ? (
              <div className="wf-blocked">
                <span>
                  <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                    Recorded reason for exceeding 90 days:{' '}
                  </strong>
                  {detail.record.breachReason}
                </span>
              </div>
            ) : null}

            <div>
              <div className="cw-section-label" style={{ marginBottom: 12 }}>
                Your actions
              </div>
              <ActionPanel caseId={detail.record.id} />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
