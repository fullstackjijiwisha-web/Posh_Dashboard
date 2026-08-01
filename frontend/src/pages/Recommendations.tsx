import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilePenLine, Scale, X } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { formatTimestamp } from '../lib/format'
import { ROLE_LABEL } from '../lib/data/types'
import '../components/workflow/Workflow.css'
import { EmptyState } from '../components/ui/EmptyState'

const ICON = { size: 14, strokeWidth: 1.5 } as const

const PROVISIONS = [
  'Section 13(3)(i) — action as misconduct under the service rules',
  'Section 13(3)(ii) — deduction from salary or wages as compensation',
  'Section 13(2) — no action; allegation not substantiated',
  'Section 12 — interim relief pending inquiry',
]

const STATUS_PILL: Record<string, string> = {
  'Under review': 'badge-progress',
  Approved: 'badge-completed',
  Returned: 'badge-medium',
  Rejected: 'badge-overdue',
}

/**
 * Recommendations console.
 *
 * The committee drafts here; the POSH Admin audits here. The return loop is the part
 * worth watching — a returned report does not vanish, it comes back as a revision with
 * the reviewer's observations attached, and the version it supersedes stays on record.
 */
export function RecommendationsPage() {
  const { allCases, flowFor, addRecommendation } = useWorkflow()
  const { can, currentRole } = useRole()
  // Set when the workspace sent us here to satisfy a precondition on one case.
  const [params, setParams] = useSearchParams()
  const focus = params.get('case')

  const isCommittee = can('workflow:committee')
  const isAdmin = can('workflow:administer')

  const [draftFor, setDraftFor] = useState<string | null>(focus)
  const [draft, setDraft] = useState({ finding: '', recommendedAction: '', provision: PROVISIONS[0] })

  // Cases where a recommendation is being drafted, is with the auditor, or has come back.
  const RELEVANT = [
    'minutes_recorded',
    'recommendation_submitted',
    'recommendation_review',
    'recommendation_returned',
    'recommendation_resubmitted',
    'recommendation_approved',
    'recommendation_rejected',
  ]

  const rows = allCases
    .filter((c) => {
      const f = flowFor(c.id)
      if (!f) return false
      if (focus) return c.id === focus
      return RELEVANT.includes(f.stage)
    })
    // Cases needing a report drafted, or an audit started, come before settled ones.
    .sort((a, b) => RELEVANT.indexOf(flowFor(a.id)!.stage) - RELEVANT.indexOf(flowFor(b.id)!.stage))

  const saveDraft = (caseId: string) => {
    if (!draft.finding.trim() || !draft.recommendedAction.trim()) return
    addRecommendation(caseId, {
      finding: draft.finding.trim(),
      recommendedAction: draft.recommendedAction.trim(),
      provision: draft.provision,
    })
    setDraftFor(null)
    setDraft({ finding: '', recommendedAction: '', provision: PROVISIONS[0] })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <div>
          <h1>Recommendations</h1>
          <p>
            Committee findings and the administrative audit of them. A report may be approved,
            returned for modification, or rejected — a returned report comes back as a revision.
          </p>
        </div>
        {focus ? (
          <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>
            <X {...ICON} />
            Showing {focus} only — show all
          </button>
        ) : (
          <span className="meta-pill">{rows.length} cases at this phase</span>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          headline="No case has reached the recommendation phase"
          detail="Cases arrive here once the committee has minuted its hearing and is ready to record findings."
        />
      ) : (
        rows.map((c) => {
          const flow = flowFor(c.id)!
          const latest = flow.recommendations[flow.recommendations.length - 1]
          const drafting = draftFor === c.id

          return (
            <section key={c.id} className="card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Link to={`/cases/${c.id}`} className="mono text-13" style={{ color: 'var(--color-accent)' }}>
                    {c.id}
                  </Link>
                  <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                  <span className="text-12 text-muted">
                    {c.department} · {c.location}
                  </span>
                </div>
                {latest ? (
                  <span className={`badge ${STATUS_PILL[latest.status] ?? 'badge-low'}`}>{latest.status}</span>
                ) : (
                  <span className="badge badge-low">No report yet</span>
                )}
              </div>

              <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {/* Versions on record, newest first. */}
                {flow.recommendations.length > 0 && (
                  <div className="wf-list">
                    {[...flow.recommendations].reverse().map((r, i) => (
                      <div key={r.id} className="wf-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div className="wf-list-title">
                            <Scale size={14} strokeWidth={1.5} style={{ color: 'var(--color-violet)' }} />
                            {r.revisionOf ? 'Revised recommendation' : 'Recommendation'}
                            {i === 0 ? <span className="meta-pill">Current</span> : <span className="meta-pill">Superseded</span>}
                          </div>
                          <span className={`badge ${STATUS_PILL[r.status] ?? 'badge-low'}`}>{r.status}</span>
                        </div>
                        <div className="wf-list-meta">
                          <strong style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Finding: </strong>
                          {r.finding}
                        </div>
                        <div className="wf-list-meta">
                          <strong style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Action recommended: </strong>
                          {r.recommendedAction}
                        </div>
                        <div className="wf-list-meta">{r.provision}</div>
                        <div className="wf-list-meta">
                          {r.author} · {r.authorRole} · {formatTimestamp(r.at)}
                        </div>
                        {r.reviewNote && (
                          <div className="wf-list-meta" style={{ color: 'var(--color-warning)' }}>
                            Reviewer’s observation: {r.reviewNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Drafting, for the committee only. */}
                {isCommittee && !latest && (
                  drafting ? (
                    <div className="wf-form">
                      <label className="wf-field">
                        Finding
                        <textarea
                          value={draft.finding}
                          onChange={(e) => setDraft({ ...draft, finding: e.target.value })}
                          placeholder="What the committee found on the record."
                        />
                      </label>
                      <label className="wf-field">
                        Action recommended
                        <textarea
                          value={draft.recommendedAction}
                          onChange={(e) => setDraft({ ...draft, recommendedAction: e.target.value })}
                          placeholder="What the committee recommends the employer do."
                        />
                      </label>
                      <label className="wf-field">
                        Provision relied on
                        <select
                          className="select"
                          value={draft.provision}
                          onChange={(e) => setDraft({ ...draft, provision: e.target.value })}
                        >
                          {PROVISIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="wf-note-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setDraftFor(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => saveDraft(c.id)}
                          disabled={!draft.finding.trim() || !draft.recommendedAction.trim()}
                        >
                          Save report
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setDraftFor(c.id)}>
                      <FilePenLine {...ICON} />
                      Draft the committee report
                    </button>
                  )
                )}

                <div>
                  <div className="cw-section-label" style={{ marginBottom: 12 }}>
                    Your actions
                  </div>
                  <ActionPanel caseId={c.id} />
                </div>
              </div>
            </section>
          )
        })
      )}

      {!isCommittee && !isAdmin && (
        <p className="text-13 text-muted">
          Drafting and auditing recommendations is reserved to the Internal Committee and the POSH
          Admin. Your role ({currentRole ? ROLE_LABEL[currentRole] : '—'}) has read access only.
        </p>
      )}
    </div>
  )
}
