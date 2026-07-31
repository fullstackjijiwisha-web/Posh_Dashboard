import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, LayoutList, Search } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META, isWorkflowTerminal } from '../lib/workflow/types'
import { StageTracker } from '../components/workflow/StageTracker'
import { hearingsFor } from '../lib/data/caseDetail'
import { formatDate } from '../lib/format'
import { actorName } from '../lib/data/users'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

const ICON = { size: 14, strokeWidth: 1.5 } as const

type Filter = 'Active' | 'Concluded' | 'All'

/**
 * Cases this member personally sits on.
 *
 * Distinct from the case inbox, which lists the whole organisation's caseload. A
 * committee member's obligations run to the inquiries they were nominated to, and
 * nothing on this screen comes from anywhere else.
 */
export function AssignedCasesPage() {
  const { myAssignedCases, flowFor, committeeById } = useWorkflow()
  const { maskParty } = useRole()
  const [filter, setFilter] = useState<Filter>('Active')
  const [query, setQuery] = useState('')

  const rows = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)
    .filter(({ flow }) => {
      const done = isWorkflowTerminal(flow.stage)
      return filter === 'All' ? true : filter === 'Active' ? !done : done
    })
    .filter(({ record }) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return [record.id, record.department, record.location, record.summary].join(' ').toLowerCase().includes(q)
    })
    .sort((a, b) => a.record.daysRemaining - b.record.daysRemaining)

  const counts = {
    Active: myAssignedCases.filter((c) => !isWorkflowTerminal(flowFor(c.id)?.stage ?? 'complaint_submitted')).length,
    Concluded: myAssignedCases.filter((c) => isWorkflowTerminal(flowFor(c.id)?.stage ?? 'complaint_submitted')).length,
    All: myAssignedCases.length,
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Assigned cases</h1>
          <p>
            The inquiries you have been nominated to sit on, with where each one stands and what is
            outstanding. You are not shown cases you do not sit on.
          </p>
        </div>
        <div className="ep-segment">
          {(['Active', 'Concluded', 'All'] as Filter[]).map((f) => (
            <button key={f} type="button" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      <div className="ep-vault-toolbar">
        <div className="ep-vault-search">
          <Search size={15} strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your cases by number, department or location"
            aria-label="Search assigned cases"
          />
        </div>
        <Link to="/summary-workspace" className="btn btn-secondary">
          <LayoutList {...ICON} />
          Summary workspace
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="wf-empty">
          {query ? 'No case matches that search.' : 'You are not sitting on any case in this category.'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ record, flow }) => {
            const board = committeeById(flow.committeeId)
            const sittings = [...hearingsFor(record.id), ...flow.hearings]
            const pendingEvidence = flow.evidence.filter((e) => e.status === 'Pending verification').length
            const urgent = record.isBreached || record.daysRemaining <= 7

            return (
              <section key={record.id} className="ep-card">
                <div className="ep-card-head">
                  <span className="ep-card-title">
                    <Link to={`/cases/${record.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                      {record.id}
                    </Link>
                    <span className={`badge ${isWorkflowTerminal(flow.stage) ? 'badge-closed' : 'badge-open'}`}>
                      {STAGE_META[flow.stage].label}
                    </span>
                    {urgent && !isWorkflowTerminal(flow.stage) ? (
                      <span className="badge badge-overdue">
                        {record.isBreached ? 'Past 90 days' : `${record.daysRemaining} days left`}
                      </span>
                    ) : null}
                  </span>
                  <Link to={`/cases/${record.id}`} className="btn btn-secondary">
                    <ExternalLink {...ICON} />
                    Open workspace
                  </Link>
                </div>

                <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  <StageTracker stage={flow.stage} />

                  <p className="text-13 text-muted" style={{ maxWidth: '84ch', lineHeight: 1.6 }}>
                    {record.summary}
                  </p>

                  <div className="ep-field-list">
                    <div>
                      <div className="ep-field-label">Parties</div>
                      <div className="ep-field-value">
                        {maskParty(record.complainant)} v {maskParty(record.respondent)}
                      </div>
                    </div>
                    <div>
                      <div className="ep-field-label">Filed</div>
                      <div className="ep-field-value">
                        {formatDate(record.filedDate)} · Day {record.daysElapsed}
                      </div>
                    </div>
                    <div>
                      <div className="ep-field-label">Board</div>
                      <div className="ep-field-value">{board?.name ?? 'Panel as recorded on the case'}</div>
                    </div>
                    <div>
                      <div className="ep-field-label">Co-members</div>
                      <div className="ep-field-value">
                        {record.assignedIC.map(actorName).join(', ')}
                      </div>
                    </div>
                    <div>
                      <div className="ep-field-label">Evidence</div>
                      <div className="ep-field-value">
                        {flow.evidence.length} on record
                        {pendingEvidence ? ` · ${pendingEvidence} pending verification` : ' · all verified'}
                      </div>
                    </div>
                    <div>
                      <div className="ep-field-label">Sittings</div>
                      <div className="ep-field-value">
                        {sittings.length} listed · {sittings.filter((h) => 'minutes' in h ? h.minutes : h.minutesRecorded).length} minuted
                      </div>
                    </div>
                    <div>
                      <div className="ep-field-label">Recommendation</div>
                      <div className="ep-field-value">
                        {flow.recommendations.length
                          ? flow.recommendations[flow.recommendations.length - 1].status
                          : 'Not yet drafted'}
                      </div>
                    </div>
                    <div>
                      <div className="ep-field-label">Advisory notes</div>
                      <div className="ep-field-value">
                        {flow.advisoryNotes.length}
                        {flow.advisoryNotes.some((n) => n.concern) ? ' · concern flagged' : ''}
                      </div>
                    </div>
                  </div>

                  {record.isBreached && record.breachReason ? (
                    <div className="wf-blocked">
                      <span>
                        <strong style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                          Recorded reason for exceeding 90 days:{' '}
                        </strong>
                        {record.breachReason}
                      </span>
                    </div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
