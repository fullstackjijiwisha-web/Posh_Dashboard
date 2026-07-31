import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePenLine, Scale } from 'lucide-react'
import { useWorkflow } from '../lib/workflow/store'
import { useRole } from '../lib/role-context'
import { STAGE_META } from '../lib/workflow/types'
import { ActionPanel } from '../components/workflow/ActionPanel'
import { AdvisoryPanel } from '../components/workflow/AdvisoryPanel'
import { formatTimestamp } from '../lib/format'
import '../components/workflow/Workflow.css'
import '../components/workflow/EmployeePortal.css'

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

type Tab = 'Awaiting you' | 'On record'

/**
 * Recommendation centre, scoped to one member's own cases.
 *
 * Two views of the same material, because a panel member asks two different questions of
 * it. "Awaiting you" is the work queue — cases where the committee still owes a report,
 * or where one has come back for revision. "On record" is the archive: every
 * recommendation the committee has issued on their cases, including the versions that
 * were superseded, which is the part that matters if anyone later asks what the panel
 * actually said and when.
 */
export function ICRecommendationsPage() {
  const { myAssignedCases, flowFor, addRecommendation } = useWorkflow()
  const { can } = useRole()
  const [tab, setTab] = useState<Tab>('Awaiting you')
  const [draftFor, setDraftFor] = useState<string | null>(null)
  const [draft, setDraft] = useState({ finding: '', recommendedAction: '', provision: PROVISIONS[0] })

  const mayDraft = can('workflow:committee')

  const rows = myAssignedCases
    .map((record) => ({ record, flow: flowFor(record.id) }))
    .filter((r): r is { record: (typeof myAssignedCases)[number]; flow: NonNullable<ReturnType<typeof flowFor>> } => !!r.flow)

  const awaiting = rows.filter((r) =>
    ['minutes_recorded', 'recommendation_returned', 'recommendation_submitted', 'recommendation_review', 'recommendation_resubmitted'].includes(
      r.flow.stage,
    ),
  )
  const onRecord = rows.filter((r) => r.flow.recommendations.length > 0)

  const shown = tab === 'Awaiting you' ? awaiting : onRecord

  const save = (caseId: string) => {
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
    <div className="flex flex-col gap-5">
      <div className="page-header">
        <div>
          <h1>Recommendation centre</h1>
          <p>
            The committee’s findings on the cases you sit on — what is still owed, and everything
            already issued. Superseded versions stay on the record.
          </p>
        </div>
        <div className="ep-segment">
          {(['Awaiting you', 'On record'] as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t} ({t === 'Awaiting you' ? awaiting.length : onRecord.length})
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="wf-empty">
          {tab === 'Awaiting you'
            ? 'Nothing is waiting on the committee. Cases arrive here once a sitting has been minuted.'
            : 'No recommendation has been issued yet on any case you sit on.'}
        </div>
      ) : (
        shown.map(({ record, flow }) => {
          const drafting = draftFor === record.id
          const needsDraft = flow.stage === 'minutes_recorded' && flow.recommendations.length === 0

          return (
            <section key={record.id} className="ep-card">
              <div className="ep-card-head">
                <span className="ep-card-title">
                  <Link to={`/cases/${record.id}`} className="mono" style={{ color: 'var(--color-accent)' }}>
                    {record.id}
                  </Link>
                  <span className="badge badge-open">{STAGE_META[flow.stage].label}</span>
                </span>
                <span className="meta-pill">
                  {flow.recommendations.length} version{flow.recommendations.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {/* Versions, newest first. */}
                {flow.recommendations.length > 0 && (
                  <div className="wf-list">
                    {[...flow.recommendations].reverse().map((r, i) => (
                      <div key={r.id} className="wf-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div className="wf-list-title">
                            <Scale size={14} strokeWidth={1.5} style={{ color: 'var(--color-violet)' }} />
                            {r.revisionOf ? 'Revised recommendation' : 'Recommendation'}
                            <span className="meta-pill">{i === 0 ? 'Current' : 'Superseded'}</span>
                          </div>
                          <span className={`badge ${STATUS_PILL[r.status] ?? 'badge-low'}`}>{r.status}</span>
                        </div>
                        <div className="wf-list-meta">
                          <strong style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Finding: </strong>
                          {r.finding}
                        </div>
                        <div className="wf-list-meta">
                          <strong style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Action: </strong>
                          {r.recommendedAction}
                        </div>
                        <div className="wf-list-meta">{r.provision}</div>
                        <div className="wf-list-meta">
                          {r.author} · {r.authorRole} · {formatTimestamp(r.at)}
                        </div>
                        {r.reviewNote ? (
                          <div className="wf-list-meta" style={{ color: 'var(--color-warning)' }}>
                            Reviewer’s observation: {r.reviewNote}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {/* Drafting */}
                {mayDraft && needsDraft && (
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
                          onClick={() => save(record.id)}
                          disabled={!draft.finding.trim() || !draft.recommendedAction.trim()}
                        >
                          Save report
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => setDraftFor(record.id)}
                    >
                      <FilePenLine {...ICON} />
                      Draft the committee report
                    </button>
                  )
                )}

                <div>
                  <div className="cw-section-label" style={{ marginBottom: 12 }}>
                    Your actions
                  </div>
                  <ActionPanel caseId={record.id} />
                </div>

                <div>
                  <div className="cw-section-label" style={{ marginBottom: 12 }}>
                    Your advisory position
                  </div>
                  <AdvisoryPanel caseIds={[record.id]} limit={3} />
                </div>
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
