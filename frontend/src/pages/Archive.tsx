import { Link } from 'react-router-dom'
import { Archive as ArchiveIcon, Lock } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { formatDate, formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'

/**
 * The end of the ladder.
 *
 * Archiving is a workflow step, not a filter — a case reaches this page because someone
 * with the POSH Admin role archived it after the complainant gave feedback, and the
 * event that did so is on the record below.
 */
export function ArchivePage() {
  const { visibleCases, flowFor } = useWorkflow()
  const { maskParty } = useRole()

  const archived = visibleCases.filter((c) => flowFor(c.id)?.stage === 'case_archived')
  const closed = visibleCases.filter((c) => {
    const s = flowFor(c.id)?.stage
    return s && ['case_closed', 'employee_notified', 'decision_viewed', 'feedback_submitted'].includes(s)
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Archive</h1>
          <p>
            Cases sealed under the retention policy, and closed cases still moving through
            notification and feedback before they can be sealed.
          </p>
        </div>
        <span className="meta-pill">{archived.length} archived · {closed.length} awaiting archive</span>
      </div>

      <section>
        <div className="cw-section-label" style={{ marginBottom: 12 }}>
          Sealed — {archived.length}
        </div>
        {archived.length === 0 ? (
          <div className="wf-empty">No case has been archived yet.</div>
        ) : (
          <div className="wf-list">
            {archived.map((c) => {
              const flow = flowFor(c.id)!
              const sealed = flow.history[flow.history.length - 1]
              return (
                <div key={c.id} className="wf-list-item">
                  <div style={{ minWidth: 0 }}>
                    <div className="wf-list-title">
                      <ArchiveIcon size={14} strokeWidth={1.5} style={{ color: 'var(--color-secondary-text)' }} />
                      <Link to={`/cases/${c.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                        {c.id}
                      </Link>
                      <span className="badge badge-closed">Archived</span>
                    </div>
                    <div className="wf-list-meta">
                      {maskParty(c.complainant)} v {maskParty(c.respondent)} · {c.department} · filed{' '}
                      {formatDate(c.filedDate)}
                    </div>
                    {flow.finalDecision && (
                      <div className="wf-list-meta">
                        Outcome: {flow.finalDecision.outcome} — {flow.finalDecision.action}
                      </div>
                    )}
                    <div className="wf-list-meta">
                      Sealed by {sealed.actorName} on {formatTimestamp(sealed.at)}
                    </div>
                  </div>
                  <span className="wf-list-meta" style={{ marginTop: 0, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={11} strokeWidth={2} />
                    Retention: 7 years
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="cw-section-label" style={{ marginBottom: 12 }}>
          Closed, not yet sealed — {closed.length}
        </div>
        {closed.length === 0 ? (
          <div className="wf-empty">Nothing is waiting to be archived.</div>
        ) : (
          <div className="wf-list">
            {closed.map((c) => {
              const flow = flowFor(c.id)!
              return (
                <div key={c.id} className="wf-list-item">
                  <div style={{ minWidth: 0 }}>
                    <div className="wf-list-title">
                      <Link to={`/cases/${c.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                        {c.id}
                      </Link>
                      <span className="badge badge-progress">{STAGE_META[flow.stage].label}</span>
                    </div>
                    <div className="wf-list-meta">{STAGE_META[flow.stage].description}</div>
                  </div>
                  <Link to={`/cases/${c.id}`} className="btn btn-secondary" style={{ flexShrink: 0 }}>
                    Open workspace
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
